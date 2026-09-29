// ─────────────────────────────────────────────────────────────────────────────
// Novixa Beauty Glow — Jenkins CI/CD Pipeline
// Triggers on push to 'main' branch → builds Docker image → deploys to VPS
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    // ── Environment ──────────────────────────────────────────────────────────
    environment {
        // Docker image name (no registry prefix = local build)
        DOCKER_IMAGE     = 'novixa-beauty-glow'
        // Tag with build number for rollback capability
        IMAGE_TAG        = "${env.BUILD_NUMBER}"
        // VPS connection details (configure in Jenkins credentials)
        VPS_HOST         = credentials('novixa-vps-host')         // e.g. 192.168.1.100
        VPS_USER         = credentials('novixa-vps-user')         // e.g. deploy
        VPS_SSH_KEY      = credentials('novixa-vps-ssh-key')      // SSH private key
        // Application deployment path on VPS
        DEPLOY_PATH      = '/opt/novixa'
        // Docker Compose project name
        COMPOSE_PROJECT  = 'novixa'
    }

    // ── Options ──────────────────────────────────────────────────────────────
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    // ── Triggers ─────────────────────────────────────────────────────────────
    triggers {
        // Poll SCM every 2 minutes (or use webhook for instant triggers)
        pollSCM('H/2 * * * *')
    }

    stages {
        // ── 1. Checkout ──────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                }
                echo "📦 Building commit: ${env.GIT_COMMIT_SHORT} — ${env.GIT_COMMIT_MSG}"
            }
        }

        // ── 2. Lint & Type Check ─────────────────────────────────────────────
        stage('Lint & Type Check') {
            agent {
                docker {
                    image 'node:20-alpine'
                    args '-v $HOME/.npm:/root/.npm'  // cache npm packages
                }
            }
            steps {
                sh 'npm ci --ignore-scripts'
                sh 'npx prisma generate'
                sh 'npx tsc --noEmit'
                sh 'npm run lint'
            }
        }

        // ── 3. Build Docker Image ────────────────────────────────────────────
        stage('Build Docker Image') {
            steps {
                script {
                    echo "🐳 Building Docker image: ${DOCKER_IMAGE}:${IMAGE_TAG}"
                    sh """
                        docker build \
                            --build-arg NODE_ENV=production \
                            -t ${DOCKER_IMAGE}:${IMAGE_TAG} \
                            -t ${DOCKER_IMAGE}:latest \
                            -f Dockerfile \
                            .
                    """
                }
            }
        }

        // ── 4. Save & Transfer Image to VPS ──────────────────────────────────
        stage('Transfer to VPS') {
            steps {
                script {
                    echo "📤 Saving and transferring image to VPS..."
                    sh """
                        docker save ${DOCKER_IMAGE}:${IMAGE_TAG} | gzip > /tmp/${DOCKER_IMAGE}-${IMAGE_TAG}.tar.gz
                    """
                    sshagent(credentials: ['novixa-vps-ssh-key']) {
                        sh """
                            scp -o StrictHostKeyChecking=no \
                                /tmp/${DOCKER_IMAGE}-${IMAGE_TAG}.tar.gz \
                                ${VPS_USER}@${VPS_HOST}:/tmp/

                            ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} '
                                docker load < /tmp/${DOCKER_IMAGE}-${IMAGE_TAG}.tar.gz
                                rm -f /tmp/${DOCKER_IMAGE}-${IMAGE_TAG}.tar.gz
                            '
                        """
                    }
                    // Clean up local tar
                    sh "rm -f /tmp/${DOCKER_IMAGE}-${IMAGE_TAG}.tar.gz"
                }
            }
        }

        // ── 5. Deploy on VPS ─────────────────────────────────────────────────
        stage('Deploy') {
            steps {
                script {
                    echo "🚀 Deploying to VPS..."
                    sshagent(credentials: ['novixa-vps-ssh-key']) {
                        // Transfer latest compose
                        sh """
                            scp -o StrictHostKeyChecking=no \
                                docker-compose.prod.yml \
                                ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/docker-compose.prod.yml
                        """

                        // Deploy on VPS
                        sh """
                            ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} '
                                cd ${DEPLOY_PATH}

                                # Export image tag for docker compose
                                export IMAGE_TAG=${IMAGE_TAG}

                                # Run database migrations
                                docker compose -f docker-compose.prod.yml \
                                    --profile migration \
                                    run --rm migrate

                                # Rolling update — pull new image, recreate only changed services
                                docker compose -f docker-compose.prod.yml \
                                    -p ${COMPOSE_PROJECT} \
                                    up -d --no-deps --force-recreate app

                                # Prune old images (keep last 3)
                                docker images ${DOCKER_IMAGE} --format "{{.Tag}}" \
                                    | sort -rn | tail -n +4 \
                                    | xargs -r -I{} docker rmi ${DOCKER_IMAGE}:{}

                                echo "✅ Deployment complete — image tag: ${IMAGE_TAG}"
                            '
                        """
                    }
                }
            }
        }

        // ── 6. Health Check ──────────────────────────────────────────────────
        stage('Health Check') {
            steps {
                script {
                    echo "🏥 Running post-deploy health check..."
                    sshagent(credentials: ['novixa-vps-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} '
                                # Wait for container to become healthy
                                for i in 1 2 3 4 5 6; do
                                    STATUS=\$(docker inspect --format="{{.State.Health.Status}}" novixa-app 2>/dev/null || echo "not_found")
                                    if [ "\$STATUS" = "healthy" ]; then
                                        echo "✅ App is healthy!"
                                        exit 0
                                    fi
                                    echo "⏳ Waiting for app to become healthy... (\$STATUS) — attempt \$i/6"
                                    sleep 10
                                done
                                echo "❌ App failed health check after 60s"
                                docker logs novixa-app --tail 50
                                exit 1
                            '
                        """
                    }
                }
            }
        }
    }

    // ── Post Actions ─────────────────────────────────────────────────────────
    post {
        success {
            echo """
            ╔══════════════════════════════════════════════╗
            ║  ✅  DEPLOYMENT SUCCESSFUL                   ║
            ║  Image: ${DOCKER_IMAGE}:${IMAGE_TAG}         ║
            ║  Commit: ${env.GIT_COMMIT_SHORT}             ║
            ╚══════════════════════════════════════════════╝
            """
        }
        failure {
            echo """
            ╔══════════════════════════════════════════════╗
            ║  ❌  DEPLOYMENT FAILED                       ║
            ║  Check logs above for details                ║
            ╚══════════════════════════════════════════════╝
            """
            // Optional: rollback to previous version
            script {
                def prevTag = (env.BUILD_NUMBER.toInteger() - 1).toString()
                echo "💡 To rollback, run: IMAGE_TAG=${prevTag} docker compose -f docker-compose.prod.yml up -d app"
            }
        }
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  ShoppingBag,
  Eye,
  Flower2,
  TreePine,
  Waves,
  Flame,
  Sun,
  Moon,
  Briefcase,
  Heart,
  Feather,
  Zap,
  Crown,
  Leaf,
} from "lucide-react";
import { Product } from "@/lib/products/catalogue";
import { formatPrice, useCommerce } from "@/lib/commerce/context";
import { Button } from "@/components/ui/button";

interface ScentFinderClientProps {
  fragrances: Product[];
}

interface QuestionOption {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  icon: typeof Sparkles;
  keywords: string[];
}

interface Question {
  id: "profile" | "occasion" | "sillage" | "season";
  step: number;
  label: string;
  question: string;
  description: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: "profile",
    step: 1,
    label: "Step 01 / 04",
    question: "What olfactive family resonates most with your senses?",
    description:
      "Select the sensory atmosphere that you naturally gravitate toward when you envision your personal presence.",
    options: [
      {
        id: "floral",
        title: "Velvet Florals & Rose",
        subtitle: "Luminous petals, Damask rose, powdery iris, and peony blossom",
        badge: "Opulent & Romantic",
        icon: Flower2,
        keywords: ["rose", "floral", "iris", "peony", "lily", "freesia", "jasmine"],
      },
      {
        id: "woody",
        title: "Smoky Woods & Leather",
        subtitle: "Aged cedarwood, dark vetiver, smoky incense, and warm leather accords",
        badge: "Magnetic & Grounded",
        icon: TreePine,
        keywords: ["woody", "cedar", "vetiver", "leather", "oud", "suede", "cypress"],
      },
      {
        id: "aquatic",
        title: "Aquatic Marine & Crisp Citrus",
        subtitle: "Sun-drenched sea salt, Italian bergamot, neroli, and mineral breezes",
        badge: "Fresh & Energizing",
        icon: Waves,
        keywords: ["marine", "citrus", "aquatic", "neroli", "lemon", "grapefruit", "fresh"],
      },
      {
        id: "amber",
        title: "Warm Amber & Exotic Spice",
        subtitle: "Golden saffron, velvety sandalwood, tonka bean, and sweet amberwood",
        badge: "Sensual & Enigmatic",
        icon: Flame,
        keywords: ["amber", "sandalwood", "saffron", "spicy", "vanilla", "tonka", "nutmeg"],
      },
    ],
  },
  {
    id: "occasion",
    step: 2,
    label: "Step 02 / 04",
    question: "In what setting will this formulation be experienced?",
    description:
      "Every fragrance radiates differently depending on ambient temperature, environment, and social proximity.",
    options: [
      {
        id: "signature",
        title: "Daily Signature Scent",
        subtitle:
          "Effortless, poised everyday elegance that seamlessly transitions morning to dusk",
        badge: "Everyday Masterpiece",
        icon: Sun,
        keywords: ["Signature", "Daytime"],
      },
      {
        id: "evening",
        title: "Nocturne & Black-Tie Gala",
        subtitle:
          "Opulent, hypnotic, and formulated for lingering impressions under evening lights",
        badge: "After-Dark Allure",
        icon: Moon,
        keywords: ["Evening"],
      },
      {
        id: "work",
        title: "Executive & Workspace Poise",
        subtitle: "Crisp, sophisticated aura that commands quiet respect without overpowering",
        badge: "Refined Authority",
        icon: Briefcase,
        keywords: ["Work", "Signature"],
      },
      {
        id: "intimate",
        title: "Sensual & Intimate Rendezvous",
        subtitle: "A warm, skin-close trail reserved only for those invited into your aura",
        badge: "Close Skin Scent",
        icon: Heart,
        keywords: ["musk", "amber", "rose", "vanilla"],
      },
    ],
  },
  {
    id: "sillage",
    step: 3,
    label: "Step 03 / 04",
    question: "How do you prefer your fragrance sillage & projection?",
    description:
      "Sillage defines the invisible fragrance veil and aromatic footprint you leave as you pass by.",
    options: [
      {
        id: "subtle",
        title: "Intimate Skin Veil (6–7 Hours)",
        subtitle: "Soft, personal projection that stays close to collarbones and pulse points",
        badge: "Whispered Elegance",
        icon: Feather,
        keywords: ["6 hours", "6–8 hours"],
      },
      {
        id: "radiant",
        title: "Luminous Radiance (8–10 Hours)",
        subtitle: "Balanced, memorable aura that lingers gracefully in a room as you converse",
        badge: "Harmonious Presence",
        icon: Zap,
        keywords: ["8 hours", "8–10 hours", "9 hours"],
      },
      {
        id: "bold",
        title: "Commanding Sillage (10–12+ Hours)",
        subtitle:
          "Intense extrait-strength trail that announces your presence and lingers all night",
        badge: "Unapologetic Power",
        icon: Crown,
        keywords: ["10 hours", "10–12 hours"],
      },
    ],
  },
  {
    id: "season",
    step: 4,
    label: "Step 04 / 04",
    question: "Which seasonal atmosphere calls to you right now?",
    description:
      "The heat or chill of the air interacts with top and base molecular weights to transform the drydown.",
    options: [
      {
        id: "autumn",
        title: "Crisp Autumn & Twilight Glow",
        subtitle: "Cashmere knits, crackling leaves, spiced notes, and golden velvet skies",
        badge: "Warm & Enveloping",
        icon: Leaf,
        keywords: ["amber", "woody", "rose", "spicy"],
      },
      {
        id: "summer",
        title: "Sunlit Summer Solstice",
        subtitle: "Mediterranean sunbeams, ocean spray, blooming jasmine, and sparkling citrus",
        badge: "Luminous & Airy",
        icon: Sun,
        keywords: ["marine", "citrus", "neroli", "fresh"],
      },
      {
        id: "winter",
        title: "Winter Warmth & Opulence",
        subtitle: "Fireside warmth, precious oud, creamy sandalwood, and rich balsamic resins",
        badge: "Rich & Cozy",
        icon: Moon,
        keywords: ["leather", "oud", "sandalwood", "vanilla"],
      },
      {
        id: "timeless",
        title: "Seasonless Eternal Icon",
        subtitle: "A balanced olfactive harmony calibrated to adapt gracefully in any temperature",
        badge: "All-Year Masterpiece",
        icon: Sparkles,
        keywords: ["Signature", "woody", "floral"],
      },
    ],
  },
];

interface MatchedFragrance {
  product: Product;
  matchScore: number;
  matchPercentage: number;
  reason: string;
  pairingTitle: string;
}

export function ScentFinderClient({ fragrances }: ScentFinderClientProps) {
  const { addToCart } = useCommerce();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<{
    profile?: string;
    occasion?: string;
    sillage?: string;
    season?: string;
  }>({});

  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<MatchedFragrance[] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const currentQuestion = QUESTIONS[currentStepIndex];
  const selectedOptionId = answers[currentQuestion?.id];

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentStepIndex < QUESTIONS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      calculateMatches();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const calculateMatches = () => {
    setIsCalculating(true);

    setTimeout(() => {
      const scored: { product: Product; score: number; reason: string }[] = fragrances.map(
        (perfume) => {
          let score = 40; // baseline
          let reason = "";

          const allProductText = [
            perfume.name,
            perfume.description,
            perfume.fragranceFamily ?? "",
            ...(perfume.topNotes ?? []),
            ...(perfume.middleNotes ?? []),
            ...(perfume.baseNotes ?? []),
            ...(perfume.occasion ?? []),
            perfume.longevity ?? "",
            ...perfume.tags,
          ]
            .join(" ")
            .toLowerCase();

          // 1. Profile scoring (+35 max)
          const profileQ = QUESTIONS[0].options.find((o) => o.id === answers.profile);
          if (profileQ) {
            let profileMatches = 0;
            profileQ.keywords.forEach((kw) => {
              if (allProductText.includes(kw.toLowerCase())) profileMatches++;
            });
            const profileBonus = Math.min(35, profileMatches * 10);
            score += profileBonus;
            if (profileBonus >= 20) {
              reason = `Features signature ${profileQ.title.toLowerCase()} accords aligned with your profile.`;
            }
          }

          // 2. Occasion scoring (+25 max)
          const occasionQ = QUESTIONS[1].options.find((o) => o.id === answers.occasion);
          if (occasionQ) {
            const hasOccasion = (perfume.occasion ?? []).some((occ) =>
              occasionQ.keywords.some((k) => occ.toLowerCase().includes(k.toLowerCase())),
            );
            if (hasOccasion) {
              score += 25;
            } else {
              const textMatch = occasionQ.keywords.some((k) =>
                allProductText.includes(k.toLowerCase()),
              );
              if (textMatch) score += 15;
            }
          }

          // 3. Sillage & Longevity scoring (+20 max)
          const sillageQ = QUESTIONS[2].options.find((o) => o.id === answers.sillage);
          if (sillageQ && perfume.longevity) {
            if (
              sillageQ.keywords.some((k) =>
                perfume.longevity?.toLowerCase().includes(k.toLowerCase()),
              )
            ) {
              score += 20;
            } else {
              score += 10;
            }
          }

          // 4. Season scoring (+15 max)
          const seasonQ = QUESTIONS[3].options.find((o) => o.id === answers.season);
          if (seasonQ) {
            let seasonMatches = 0;
            seasonQ.keywords.forEach((kw) => {
              if (allProductText.includes(kw.toLowerCase())) seasonMatches++;
            });
            score += Math.min(15, seasonMatches * 5);
          }

          return { product: perfume, score, reason };
        },
      );

      // Sort descending by score
      scored.sort((a, b) => b.score - a.score);

      const topTwo = scored.slice(0, 2);

      const formattedResults: MatchedFragrance[] = [
        {
          product: topTwo[0].product,
          matchScore: topTwo[0].score,
          matchPercentage: 98,
          reason: topTwo[0].reason || "Flawless harmony with your preferred olfactive pyramid.",
          pairingTitle: "YOUR SIGNATURE MASTERPIECE",
        },
        {
          product: topTwo[1]?.product ?? topTwo[0].product,
          matchScore: topTwo[1]?.score ?? 90,
          matchPercentage: 94,
          reason: topTwo[1]?.reason || "Complementary notes for layering or nighttime transitions.",
          pairingTitle: "THE NOCTURNE PAIRING",
        },
      ];

      setResults(formattedResults);
      setIsCalculating(false);
    }, 1200);
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStepIndex(0);
    setResults(null);
  };

  const handleAddToCart = async (productId: string) => {
    try {
      setAddingId(productId);
      await addToCart(productId, 1);
    } finally {
      setTimeout(() => {
        setAddingId(null);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-background text-foreground py-12 md:py-20">
      <div className="page-shell max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sand/60 dark:bg-card border border-border/80 text-rosewood dark:text-amber-400 text-[10px] font-semibold uppercase tracking-[0.25em] mb-4">
            <Sparkles size={12} className="text-amber-500" />
            <span>L'Atelier Olfactif • Scent Concierge</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground">
            {results ? "Your Olfactive Prescription" : "Discover Your Signature Scent"}
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {results
              ? "Based on your sensory consultation, our master formulation algorithm has selected two extraordinary creations tailored to your aesthetic."
              : "Embark on an immersive 4-step sensory consultation to unveil the Novixa fragrance calibrated perfectly to your aura and setting."}
          </p>
        </div>

        {/* LOADING CALCULATION STATE */}
        {isCalculating && (
          <div className="bg-card border border-border/80 p-12 md:p-16 text-center space-y-6 shadow-sm">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center h-20 w-20">
                <div className="absolute inset-0 rounded-full border-2 border-rosewood/20 border-t-rosewood animate-spin" />
                <Sparkles className="text-rosewood animate-pulse" size={26} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-2xl">Analyzing Olfactory Pyramids</h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Balancing volatile top citrus accords, rare heart petals, and lingering resinous
                base woods against your sensory profile...
              </p>
            </div>
          </div>
        )}

        {/* RESULTS PRESENTATION */}
        {!isCalculating && results && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Consultation Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-border/80 bg-sand/30 dark:bg-card text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Consultation Parameters:
                </span>
                {Object.entries(answers).map(([key, val]) => {
                  const q = QUESTIONS.find((q) => q.id === key);
                  const opt = q?.options.find((o) => o.id === val);
                  return opt ? (
                    <span
                      key={key}
                      className="px-2 py-0.5 bg-background border border-border text-[11px] font-medium"
                    >
                      {opt.title}
                    </span>
                  ) : null;
                })}
              </div>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rosewood hover:underline ml-auto"
              >
                <RotateCcw size={13} />
                <span>Retake Consultation</span>
              </button>
            </div>

            {/* Product Result Cards */}
            <div className="grid gap-8 md:grid-cols-2">
              {results.map((match, idx) => (
                <div
                  key={match.product.id}
                  className={`relative flex flex-col justify-between border bg-card p-6 md:p-8 transition-all hover:shadow-xl ${
                    idx === 0
                      ? "border-rosewood/60 dark:border-amber-400/60 ring-1 ring-rosewood/20"
                      : "border-border"
                  }`}
                >
                  {/* Top Match Tag */}
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-border/60">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 ${
                        idx === 0
                          ? "bg-rosewood text-white dark:bg-amber-400 dark:text-black"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {match.matchPercentage}% MATCH • {match.pairingTitle}
                    </span>
                    {match.product.badge && (
                      <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
                        {match.product.badge}
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="pt-6 space-y-6">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-sand/20 border border-border/40 relative group">
                      <img
                        src={match.product.images[0]}
                        alt={match.product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 right-3 bg-ink/90 text-white text-[10px] uppercase font-mono px-2 py-1 tracking-widest">
                        {match.product.gender}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/products/${match.product.slug}`}
                          className="font-display text-2xl hover:text-rosewood transition-colors leading-tight"
                        >
                          {match.product.name}
                        </Link>
                        <span className="text-base font-semibold shrink-0">
                          {formatPrice(match.product.salePrice ?? match.product.price)}
                        </span>
                      </div>
                      <p className="text-xs text-rosewood dark:text-amber-400 font-medium tracking-wide mt-1">
                        {match.product.fragranceFamily}
                      </p>
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                        {match.product.description}
                      </p>
                    </div>

                    {/* Olfactory Pyramid Breakdown */}
                    <div className="p-4 bg-sand/20 dark:bg-background/50 border border-border/60 space-y-2 text-xs">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Olfactory Architecture
                      </p>
                      {match.product.topNotes && match.product.topNotes.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-16 shrink-0 text-[11px]">
                            Top Notes:
                          </span>
                          <span className="font-medium text-[11px] text-foreground">
                            {match.product.topNotes.join(" • ")}
                          </span>
                        </div>
                      )}
                      {match.product.middleNotes && match.product.middleNotes.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-16 shrink-0 text-[11px]">
                            Heart Notes:
                          </span>
                          <span className="font-medium text-[11px] text-foreground">
                            {match.product.middleNotes.join(" • ")}
                          </span>
                        </div>
                      )}
                      {match.product.baseNotes && match.product.baseNotes.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-16 shrink-0 text-[11px]">
                            Base Notes:
                          </span>
                          <span className="font-medium text-[11px] text-foreground">
                            {match.product.baseNotes.join(" • ")}
                          </span>
                        </div>
                      )}
                      {match.product.longevity && (
                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Longevity: {match.product.longevity}</span>
                          <span>{match.product.occasion?.join(" / ")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 space-y-2">
                    <Button
                      onClick={() => handleAddToCart(match.product.id)}
                      disabled={addingId === match.product.id}
                      className="w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] uppercase font-semibold tracking-[0.16em] flex items-center justify-center gap-2"
                    >
                      {addingId === match.product.id ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span>Added to Bag</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={14} />
                          <span>Add to Bag</span>
                        </>
                      )}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-none py-5 text-[10px] uppercase font-semibold tracking-[0.14em]"
                    >
                      <Link
                        href={`/products/${match.product.slug}`}
                        className="flex items-center justify-center gap-1.5"
                      >
                        <Eye size={13} />
                        <span>Discover Full Formulation</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Atelier Notes */}
            <div className="p-6 md:p-8 border border-border bg-card text-center space-y-4">
              <Sparkles className="mx-auto text-rosewood" size={20} />
              <h4 className="font-display text-xl">The NOVIXA Bottle Guarantee</h4>
              <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Every full-size eau de parfum order is accompanied by a complimentary 2ml discovery
                vial. Experience the fragrance on your skin first; if it does not harmonize, you may
                return the unopened full-size presentation box within 7 days for a full refund.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-4">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="rounded-none text-[10px] uppercase tracking-widest py-4 px-6"
                >
                  <RotateCcw size={12} className="mr-1.5" />
                  Try Different Notes
                </Button>
                <Button
                  asChild
                  className="rounded-none bg-ink text-white hover:bg-black text-[10px] uppercase tracking-widest py-4 px-6"
                >
                  <Link href="/shop?category=perfume">
                    Explore All Fragrances <ArrowRight size={12} className="ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP-BY-STEP QUIZ QUESTIONS */}
        {!isCalculating && !results && currentQuestion && (
          <div className="bg-card border border-border/80 shadow-sm p-6 sm:p-8 md:p-12 space-y-8 animate-in fade-in duration-300">
            {/* Step Progress & Indicators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rosewood dark:text-amber-400">
                  {currentQuestion.label}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {Math.round(((currentStepIndex + 1) / QUESTIONS.length) * 100)}% Complete
                </span>
              </div>
              <div className="h-1 w-full bg-border/60 overflow-hidden rounded-full">
                <div
                  className="h-full bg-rosewood dark:bg-amber-400 transition-all duration-500 ease-out"
                  style={{
                    width: `${((currentStepIndex + 1) / QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Title */}
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-foreground">
                {currentQuestion.question}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentQuestion.description}
              </p>
            </div>

            {/* Option Cards */}
            <div className="grid gap-3.5 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                const IconComponent = option.icon;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={`text-left p-5 md:p-6 border transition-all flex flex-col justify-between gap-4 group cursor-pointer ${
                      isSelected
                        ? "border-rosewood dark:border-amber-400 bg-sand/30 dark:bg-card/80 ring-1 ring-rosewood/30"
                        : "border-border hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`h-9 w-9 rounded-none flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-rosewood text-white dark:bg-amber-400 dark:text-black border-transparent"
                              : "bg-muted text-muted-foreground border-border group-hover:text-foreground"
                          }`}
                        >
                          <IconComponent size={18} />
                        </div>
                        {option.badge && (
                          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-display text-lg text-foreground group-hover:text-rosewood transition-colors">
                          {option.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {option.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border/40 text-[10px] uppercase font-bold tracking-wider">
                      <span
                        className={
                          isSelected ? "text-rosewood dark:text-amber-400" : "text-muted-foreground"
                        }
                      >
                        {isSelected ? "Selected Accord" : "Tap to Select"}
                      </span>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-rosewood bg-rosewood text-white dark:border-amber-400 dark:bg-amber-400 dark:text-black"
                            : "border-border/80"
                        }`}
                      >
                        {isSelected && <Check size={10} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-border/60">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className="rounded-none text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-0"
              >
                <ArrowLeft size={13} className="mr-1.5" />
                Previous
              </Button>

              <Button
                onClick={handleNext}
                disabled={!selectedOptionId}
                className="rounded-none bg-ink text-white hover:bg-black py-5 px-8 text-[10px] uppercase font-semibold tracking-[0.16em] disabled:opacity-40"
              >
                <span>
                  {currentStepIndex === QUESTIONS.length - 1 ? "Calculate Formulation" : "Continue"}
                </span>
                <ArrowRight size={13} className="ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

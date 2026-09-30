import { Resend } from "resend";
import nodemailer from "nodemailer";

const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || (smtpHost === "smtp.gmail.com" ? 465 : 587));
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

const smtpTransport =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

export const SENDER_EMAIL =
  process.env.EMAIL_FROM ||
  (smtpUser ? `NOVIXA <${smtpUser}>` : "NOVIXA <novixaretail@gmail.com>");

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || "novixaretail@gmail.com";

// Derive the plain display email for use in HTML templates
const SUPPORT_DISPLAY_EMAIL = smtpUser || process.env.SUPPORT_EMAIL || "novixaretail@gmail.com";

interface SendMailOptions {
  from?: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
}

/**
 * Universal email dispatcher supporting Gmail/SMTP (via nodemailer), Resend, or local simulated mode.
 */
export async function sendMail(options: SendMailOptions) {
  const from = options.from || SENDER_EMAIL;

  // 1. Prioritize SMTP if configured (e.g. Gmail)
  if (smtpTransport) {
    try {
      const info = await smtpTransport.sendMail({
        from,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
      });
      return { ok: true, id: info.messageId, provider: "smtp" as const };
    } catch (err: any) {
      console.warn("SMTP email dispatch error:", err.message);
      return { ok: false, error: err.message, provider: "smtp" as const };
    }
  }

  // 2. Resend if configured
  if (resend) {
    try {
      const result = await resend.emails.send({
        from,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
      });
      return { ok: true, id: result.data?.id, provider: "resend" as const };
    } catch (err: any) {
      console.warn("Resend email dispatch error:", err.message);
      return { ok: false, error: err.message, provider: "resend" as const };
    }
  }

  // 3. Fallback simulated mode
  console.log(`[Email Simulated] To: ${options.to} | Subject: "${options.subject}"`);
  return { ok: true, simulated: true };
}

// ---------------------------------------------------------------------------
// Shared HTML helpers
// ---------------------------------------------------------------------------

function emailHeader(title: string) {
  return `
    <!-- Brand Header -->
    <tr>
      <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f0eae4;">
        <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: 400; letter-spacing: 0.25em; text-transform: uppercase; color: #211b18;">
          NOVIXA
        </h1>
        <p style="margin: 6px 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #8f5d48;">
          Haute Parfumerie &middot; London
        </p>
        ${title ? `<p style="margin: 14px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #665b53; background:#faf7f4; display:inline-block; padding: 4px 14px;">${title}</p>` : ""}
      </td>
    </tr>`;
}

function emailFooter() {
  return `
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0eae4; font-size: 11px; color: #a1958b;">
        <p style="margin: 0 0 6px;">Questions regarding your order?</p>
        <p style="margin: 0;">
          Contact our concierge at <a href="mailto:${SUPPORT_DISPLAY_EMAIL}" style="color: #8f5d48; text-decoration: none;">${SUPPORT_DISPLAY_EMAIL}</a>
        </p>
        <p style="margin: 16px 0 0; font-size: 10px; color: #c4b9b0;">
          &copy; 2026 NOVIXA Beauty &amp; Glow. London, UK. All rights reserved.
        </p>
      </td>
    </tr>`;
}

function emailWrapper(innerRows: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #faf7f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #211b18;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf7f4; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e8ded6; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
            ${innerRows}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Order Confirmation Email
// ---------------------------------------------------------------------------

interface OrderItemEmail {
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
}

interface OrderConfirmationEmailParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderItemEmail[];
  subtotal: number;
  discount?: number;
  shipping: number;
  total: number;
  shippingAddress: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  paymentMethod: string;
  deliveryMethodName?: string | null;
}

/**
 * Sends a luxury HTML order confirmation email to the customer.
 */
export async function sendOrderConfirmationEmail(params: OrderConfirmationEmailParams) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    items,
    subtotal,
    discount = 0,
    shipping,
    total,
    shippingAddress,
    paymentMethod,
    deliveryMethodName = "Normal Tracked Delivery",
  } = params;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #f0eae4;">
          <div style="font-family: Georgia, serif; font-size: 15px; color: #211b18; font-weight: 500;">
            ${item.productName}
          </div>
          <div style="font-size: 11px; color: #8f8279; margin-top: 3px; letter-spacing: 0.05em;">
            SKU: ${item.sku} &times; ${item.quantity}
          </div>
        </td>
        <td style="padding: 14px 0; border-bottom: 1px solid #f0eae4; text-align: right; font-size: 14px; font-weight: 600; color: #211b18;">
          &pound;${(item.unitPrice * item.quantity).toFixed(2)}
        </td>
      </tr>`,
    )
    .join("");

  const innerRows = `
    ${emailHeader("Order Confirmation")}

    <!-- Greeting -->
    <tr>
      <td style="padding: 32px 40px 20px;">
        <h2 style="margin: 0 0 12px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
          Thank you for your order, ${customerName}.
        </h2>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #665b53;">
          Your bespoke selection has been registered with our Mayfair atelier. We are carefully preparing your items for delivery.
        </p>
        <div style="margin-top: 20px; padding: 12px 16px; background-color: #fcfaf8; border-left: 3px solid #8f5d48;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8f5d48; font-weight: 600;">
            Order Reference:
          </span>
          <strong style="font-size: 14px; color: #211b18; margin-left: 8px;">${orderNumber}</strong>
        </div>
      </td>
    </tr>

    <!-- Items Breakdown -->
    <tr>
      <td style="padding: 10px 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th style="padding-bottom: 10px; border-bottom: 1px solid #211b18; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8f8279;">
                Selected Items
              </th>
              <th style="padding-bottom: 10px; border-bottom: 1px solid #211b18; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8f8279;">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Totals -->
    <tr>
      <td style="padding: 0 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #8f8279;">Subtotal</td>
            <td style="padding: 6px 0; text-align: right; color: #211b18;">&pound;${subtotal.toFixed(2)}</td>
          </tr>
          ${
            discount > 0
              ? `<tr>
              <td style="padding: 6px 0; color: #4b6742;">Promotional Savings</td>
              <td style="padding: 6px 0; text-align: right; color: #4b6742; font-weight: 600;">-&pound;${discount.toFixed(2)}</td>
            </tr>`
              : ""
          }
          <tr>
            <td style="padding: 6px 0; color: #8f8279;">Delivery (${deliveryMethodName})</td>
            <td style="padding: 6px 0; text-align: right; color: #211b18;">&pound;${shipping.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0 6px; border-top: 1px solid #211b18; font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #211b18;">
              Total Paid
            </td>
            <td style="padding: 12px 0 6px; border-top: 1px solid #211b18; text-align: right; font-size: 16px; font-weight: bold; color: #211b18;">
              &pound;${total.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="font-size: 11px; color: #8f8279; text-align: right; padding-top: 2px;">
              Payment via ${paymentMethod}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Delivery Destination -->
    <tr>
      <td style="padding: 20px 40px 32px; border-top: 1px solid #f0eae4; background-color: #faf7f4;">
        <h3 style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8f5d48;">
          Delivery Destination
        </h3>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4a4039;">
          ${customerName}<br />
          ${shippingAddress.line1}${shippingAddress.line2 ? `<br />${shippingAddress.line2}` : ""}<br />
          ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br />
          ${shippingAddress.country || "United Kingdom"}
        </p>
      </td>
    </tr>

    ${emailFooter()}`;

  return await sendMail({
    to: customerEmail,
    subject: `Your NOVIXA Order Confirmation [${orderNumber}]`,
    html: emailWrapper(innerRows),
  });
}

// ---------------------------------------------------------------------------
// Order Status Update Emails
// ---------------------------------------------------------------------------

export interface OrderStatusEmailParams {
  status: "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  cancellationReason?: string | null;
}

/**
 * Sends an order status update email to the customer.
 * Covers: PROCESSING, SHIPPED, DELIVERED, and CANCELLED states.
 */
export async function sendOrderStatusEmail(params: OrderStatusEmailParams) {
  const { status, orderNumber, customerName, customerEmail, trackingNumber, trackingUrl, cancellationReason } = params;

  let subject = "";
  let innerRows = "";

  if (status === "PROCESSING") {
    subject = `NOVIXA Is Preparing Your Order ${orderNumber} 🌿`;
    innerRows = `
      ${emailHeader("Order Processing")}
      <tr>
        <td style="padding: 36px 40px;">
          <h2 style="margin: 0 0 14px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
            We're preparing your order, ${customerName}.
          </h2>
          <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.8; color: #665b53;">
            Your NOVIXA order <strong style="color:#211b18;">${orderNumber}</strong> is now being carefully curated
            by our Mayfair atelier team. Our specialists are inspecting, wrapping, and packaging your selection with the
            care it deserves.
          </p>
          <div style="padding: 18px 20px; background: #faf7f4; border-left: 3px solid #8f5d48; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #665b53; line-height: 1.7;">
              <strong style="color:#8f5d48; font-size:10px; text-transform:uppercase; letter-spacing:0.1em;">Next Step</strong><br/>
              Your parcel will be dispatched within 1–2 business days. You will receive a separate shipping confirmation
              with your tracking number as soon as it is collected by our courier.
            </p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #a1958b;">
            We appreciate your patience as we prepare your order with the utmost attention to detail.
          </p>
        </td>
      </tr>
      ${emailFooter()}`;
  }

  else if (status === "SHIPPED") {
    subject = `Your NOVIXA Order ${orderNumber} Has Shipped ✈`;
    const trackingBlock = trackingNumber
      ? `<div style="margin: 20px 0; padding: 18px 20px; background: #f0f7ec; border: 1px solid #c5dbb8; border-radius: 2px;">
          <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #4b6742; font-weight: 600;">Tracking Reference</p>
          <p style="margin: 0; font-size: 18px; font-family: Georgia, serif; color: #211b18; letter-spacing: 0.08em;">${trackingNumber}</p>
          ${trackingUrl ? `<a href="${trackingUrl}" style="display:inline-block; margin-top: 10px; font-size: 11px; color: #4b6742; text-decoration: underline;">Track your parcel →</a>` : ""}
        </div>`
      : `<p style="font-size: 12px; color: #a1958b; margin: 12px 0;">Your tracking details will be updated within 24 hours.</p>`;

    innerRows = `
      ${emailHeader("Order Dispatched")}
      <tr>
        <td style="padding: 36px 40px;">
          <h2 style="margin: 0 0 14px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
            Your order is on its way, ${customerName}.
          </h2>
          <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.8; color: #665b53;">
            Your NOVIXA parcel <strong style="color:#211b18;">${orderNumber}</strong> has been dispatched from our
            Mayfair atelier and is now in transit to you. Please allow 3–5 business days for standard delivery.
          </p>
          ${trackingBlock}
          <p style="margin: 16px 0 0; font-size: 12px; color: #a1958b; line-height: 1.7;">
            If you have any questions about your delivery, please don't hesitate to reach out to our concierge team.
          </p>
        </td>
      </tr>
      ${emailFooter()}`;
  }

  else if (status === "DELIVERED") {
    subject = `Your NOVIXA Order ${orderNumber} Has Arrived 🎁`;
    innerRows = `
      ${emailHeader("Order Delivered")}
      <tr>
        <td style="padding: 36px 40px;">
          <h2 style="margin: 0 0 14px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
            Your order has arrived, ${customerName}.
          </h2>
          <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.8; color: #665b53;">
            We hope your NOVIXA selection — order <strong style="color:#211b18;">${orderNumber}</strong> — has been
            delivered to your satisfaction. We pour our passion into every fragrance and formulation we create, and we
            trust it will bring you a moment of true luxury.
          </p>
          <div style="padding: 18px 20px; background: #faf7f4; border-left: 3px solid #8f5d48; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #665b53; line-height: 1.7;">
              <strong style="color:#8f5d48; font-size:10px; text-transform:uppercase; letter-spacing:0.1em;">We'd Love Your Feedback</strong><br/>
              Your honest review helps other patrons discover their next signature scent. Please share your experience — it only takes a moment.
            </p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #a1958b; line-height: 1.7;">
            If anything is not quite right with your order, please contact our concierge within 14 days and we will make it right.
          </p>
        </td>
      </tr>
      ${emailFooter()}`;
  }

  else if (status === "CANCELLED") {
    subject = `Important: Your NOVIXA Order ${orderNumber} Has Been Cancelled`;
    innerRows = `
      ${emailHeader("Order Cancelled")}
      <tr>
        <td style="padding: 36px 40px;">
          <h2 style="margin: 0 0 14px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
            Your order has been cancelled, ${customerName}.
          </h2>
          <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.8; color: #665b53;">
            We regret to inform you that your order <strong style="color:#211b18;">${orderNumber}</strong> has been
            cancelled.
          </p>
          ${cancellationReason
            ? `<div style="padding: 14px 18px; background: #fdf8f6; border-left: 3px solid #c9765d; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #8f2d18; line-height: 1.7;">
                  <strong>Reason:</strong> ${cancellationReason}
                </p>
               </div>`
            : ""}
          <div style="padding: 18px 20px; background: #faf7f4; border-left: 3px solid #8f5d48; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #665b53; line-height: 1.7;">
              <strong style="color:#8f5d48; font-size:10px; text-transform:uppercase; letter-spacing:0.1em;">Refund Information</strong><br/>
              If a payment was taken, a full refund will be returned to your original payment method within 5–10 business days,
              depending on your bank. If you have not received your refund after 10 days, please contact your bank first,
              then reach out to our concierge.
            </p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #a1958b; line-height: 1.7;">
            We would love the opportunity to serve you again. Please don't hesitate to place a new order or contact our
            concierge for assistance.
          </p>
        </td>
      </tr>
      ${emailFooter()}`;
  }

  return await sendMail({
    to: customerEmail,
    subject,
    html: emailWrapper(innerRows),
  });
}

// ---------------------------------------------------------------------------
// Support Inquiry Email (Contact Form)
// ---------------------------------------------------------------------------

interface SupportInquiryEmailParams {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  orderNumber?: string | null;
  message: string;
  inquiryId?: string;
}

/**
 * Sends a notification email to the admin team and an acknowledgment to the customer.
 */
export async function sendSupportInquiryEmail(params: SupportInquiryEmailParams) {
  const { name, email, phone, subject, orderNumber, message, inquiryId } = params;

  // 1. Admin Alert
  const adminHtml = `
  <div style="font-family: sans-serif; color: #211b18; line-height: 1.6; max-width: 600px;">
    <h2 style="font-family: Georgia, serif; color: #8f5d48;">New Customer Concierge Inquiry</h2>
    <p><strong>From:</strong> ${name} (&lt;<a href="mailto:${email}">${email}</a>&gt;)</p>
    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
    ${orderNumber ? `<p><strong>Order Reference:</strong> ${orderNumber}</p>` : ""}
    <p><strong>Topic / Subject:</strong> ${subject}</p>
    <div style="margin-top: 15px; padding: 15px; background: #fbf9f7; border-left: 4px solid #8f5d48;">
      <strong>Message:</strong>
      <p style="margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="margin-top: 20px; font-size: 11px; color: #888;">
      Submitted via NOVIXA Concierge Portal${inquiryId ? ` (ID: ${inquiryId})` : ""}. Reply directly to this email to reach the patron.
    </p>
  </div>`;

  // 2. Customer Auto-Acknowledgment
  const customerHtml = emailWrapper(`
    ${emailHeader("Inquiry Received")}
    <tr>
      <td style="padding: 36px 40px;">
        <h2 style="margin: 0 0 14px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
          We have received your private inquiry.
        </h2>
        <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.8; color: #665b53;">Dear ${name},</p>
        <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.8; color: #665b53;">
          Thank you for reaching out to the NOVIXA concierge desk regarding <em>"${subject}"</em>.
        </p>
        <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.8; color: #665b53;">
          Our private beauty advisors review each correspondence individually. A dedicated specialist will
          attend to your request and respond within 24 business hours.
        </p>
        <div style="margin: 20px 0; padding: 14px 18px; background: #faf7f4; border: 1px solid #e8dfd8; font-size: 12px; color: #665b53;">
          <strong>Your Message Summary:</strong><br />
          ${message.slice(0, 200)}${message.length > 200 ? "..." : ""}
        </div>
        <p style="font-size: 12px; color: #8f8279; margin-top: 30px;">
          Warm regards,<br />
          <strong>The NOVIXA Concierge Team</strong><br />
          Mayfair, London
        </p>
      </td>
    </tr>
    ${emailFooter()}`);

  // Send to Admin
  const adminRes = await sendMail({
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[Concierge Inquiry] ${subject} - ${name}`,
    html: adminHtml,
  });

  // Send Customer Acknowledgment
  const customerRes = await sendMail({
    to: email,
    subject: `We've received your NOVIXA inquiry: ${subject}`,
    html: customerHtml,
  });

  return {
    ok: adminRes.ok && customerRes.ok,
    error: adminRes.error || customerRes.error,
  };
}

// ---------------------------------------------------------------------------
// Admin Support Reply Email
// ---------------------------------------------------------------------------

interface SupportReplyEmailParams {
  toName: string;
  toEmail: string;
  originalSubject: string;
  replyMessage: string;
  agentName?: string;
  inquiryId?: string;
}

/**
 * Sends a personal reply from the admin concierge team to the customer.
 */
export async function sendSupportReplyEmail(params: SupportReplyEmailParams) {
  const {
    toName,
    toEmail,
    originalSubject,
    replyMessage,
    agentName = "NOVIXA Concierge Team",
    inquiryId,
  } = params;

  const innerRows = `
    ${emailHeader("Personal Reply from Our Concierge")}
    <tr>
      <td style="padding: 36px 40px;">
        <h2 style="margin: 0 0 14px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #211b18;">
          A personal response from our concierge.
        </h2>
        <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8f8279;">
          Re: ${originalSubject}
        </p>
        <hr style="border: none; border-top: 1px solid #f0eae4; margin: 16px 0;" />
        <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.8; color: #665b53;">Dear ${toName},</p>
        <div style="font-size: 14px; line-height: 1.9; color: #211b18; white-space: pre-wrap;">${replyMessage}</div>
        <hr style="border: none; border-top: 1px solid #f0eae4; margin: 24px 0;" />
        <p style="font-size: 12px; color: #8f8279; margin: 0;">
          Warm regards,<br />
          <strong style="color:#211b18;">${agentName}</strong><br />
          NOVIXA Haute Parfumerie &mdash; Mayfair, London
        </p>
        ${inquiryId ? `<p style="font-size: 10px; color: #c4b9b0; margin-top: 12px;">Reference: ${inquiryId}</p>` : ""}
      </td>
    </tr>
    ${emailFooter()}`;

  return await sendMail({
    to: toEmail,
    replyTo: SUPPORT_DISPLAY_EMAIL,
    subject: `Re: ${originalSubject} — NOVIXA Concierge`,
    html: emailWrapper(innerRows),
  });
}

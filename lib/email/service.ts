import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const SENDER_EMAIL = process.env.EMAIL_FROM || "NOVIXA <concierge@novixa.co.uk>";
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || "novixaretail@gmail.com";

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

  const emailHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Order Confirmation - ${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #faf7f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #211b18;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf7f4; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e8ded6; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
              <!-- Brand Header -->
              <tr>
                <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f0eae4;">
                  <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: 400; letter-spacing: 0.25em; text-transform: uppercase; color: #211b18;">
                    NOVIXA
                  </h1>
                  <p style="margin: 6px 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #8f5d48;">
                    Haute Parfumerie &middot; London
                  </p>
                </td>
              </tr>

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

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0eae4; font-size: 11px; color: #a1958b;">
                  <p style="margin: 0 0 6px;">Questions regarding your ritual order?</p>
                  <p style="margin: 0;">
                    Contact our concierge at <a href="mailto:concierge@novixa.co.uk" style="color: #8f5d48; text-decoration: none;">concierge@novixa.co.uk</a>
                  </p>
                  <p style="margin: 16px 0 0; font-size: 10px; color: #c4b9b0;">
                    &copy; 2026 NOVIXA Beauty &amp; Glow. London, UK. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  if (resend) {
    try {
      const result = await resend.emails.send({
        from: SENDER_EMAIL,
        to: customerEmail,
        subject: `Your NOVIXA Order Confirmation [${orderNumber}]`,
        html: emailHtml,
      });
      return { ok: true, id: result.data?.id };
    } catch (err: any) {
      console.warn("Resend email dispatch error:", err.message);
      return { ok: false, error: err.message };
    }
  } else {
    console.log(`[Email Simulated - Order Confirmation] To: ${customerEmail} | Order: ${orderNumber} | Total: £${total}`);
    return { ok: true, simulated: true };
  }
}

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
  const customerHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #211b18; line-height: 1.6; max-width: 600px; padding: 20px;">
    <h2 style="font-family: Georgia, serif; font-size: 24px; color: #211b18; font-weight: normal;">
      We have received your private inquiry.
    </h2>
    <p>Dear ${name},</p>
    <p>
      Thank you for reaching out to the NOVIXA concierge desk regarding <em>"${subject}"</em>.
    </p>
    <p>
      Our private beauty advisors review each correspondence individually. A dedicated specialist will attend to your request and respond within 24 business hours.
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
  </div>`;

  if (resend) {
    try {
      // Send to Admin
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `[Concierge Inquiry] ${subject} - ${name}`,
        html: adminHtml,
      });

      // Send Customer Acknowledgment
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: email,
        subject: `We've received your NOVIXA inquiry: ${subject}`,
        html: customerHtml,
      });

      return { ok: true };
    } catch (err: any) {
      console.warn("Support email dispatch failed:", err.message);
      return { ok: false, error: err.message };
    }
  } else {
    console.log(`[Email Simulated - Support Inquiry] To Admin: ${ADMIN_EMAIL} | From: ${email} | Subject: ${subject}`);
    return { ok: true, simulated: true };
  }
}

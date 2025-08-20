
const getShipping = (domain) => {
  if (domain === 'UK') {
    return `<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Shipping</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
     <ul>
        <ul>
          <li>Free &amp; Fast Delivery - We offer free delivery to most of the United Kingdom with a normal delivery time of 2-4 days. However, in very rare situations, additional delivery time (up to 3 weeks) may be required for some items.</li>
          <li>Alternative Carriers - We may use alternative carriers (e.g. Royal Mail, DPD, Evri, ParcelForce, Yodel, etc.) to ensure your package arrives safely and on time. Due to the use of multiple carriers, we are unable to provide a tracking number automatically.</li>
          <li>Handling Time - Orders are processed and shipped within 1 business days of receiving cleared payment.</li>
        </ul>
      </ul>
    </div>
    <div style="width: 18%; float: right;">
      <div id="delivery_right">
        <br>
        <img style="width: 120px; height: 120px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/free_shipping_USA.png"
          alt>
      </div>
    </div>
  </div>
</div>`;
  } else {
    return `<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Delivery</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
     <ul>
        <ul>
          <li>Free &amp; Fast Delivery - We offer free shipping to most of the United States with a normal delivery time of 2-4 days. However, in very rare situations, additional delivery time (up to 3 weeks) may be required for some items.</li>
          <li>Alternative Carriers - We may use alternative carriers (e.g. USPS, FedEx, UPS, etc.) to ensure your package arrives safely and on time. Due to the use of multiple carriers, we are unable to provide a tracking number automatically.</li>
          <li>Handling Time - Orders are processed and shipped within 1 business days of receiving cleared payment.</li>
        </ul>
      </ul>
    </div>
    <div style="width: 18%; float: right;">
      <div id="delivery_right">
        <br>
        <img style="width: 120px; height: 120px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/Free+Delivery+(UK)png.png"
          alt>
      </div>
    </div>
  </div>
</div>`;
  }
};

export const getDescription = ({
  title,
  images = [],
  features = [],
  benefits = [],
  whyChoose,
  domain
}) => {
  let newWhyChoose = whyChoose;
  if (typeof whyChoose === 'object') {
    newWhyChoose  = Object.values(whyChoose);
  }
  // Build left-aligned content without duplicate big heading or product image per requirements
  const shortIntro = `<p style="font-family: Arial; font-size: 16px; line-height: 1.5; margin: 8px 0;">${title}</p>`;
  const featuresList = (features && features.length)
    ? `<div style="margin-top:8px"><div style="font-family: Arial; font-weight: 700; font-size: 18px;">Features &amp; Benefits</div><ul style="margin:6px 0 0 18px; font-family: Arial; font-size: 14px;">${features.slice(0, 7).map(i => `<li>${i}</li>`).join('')}</ul></div>`
    : '';
  const benefitsList = (benefits && benefits.length)
    ? `<ul style="margin:6px 0 0 18px; font-family: Arial; font-size: 14px;">${benefits.slice(0, Math.max(0, 7 - (features?.length || 0))).map(i => `<li>${i}</li>`).join('')}</ul>`
    : '';
  const whyChooseDiv = (newWhyChoose && newWhyChoose.length)
    ? `<div style="margin-top:10px"><div style="font-family: Arial; font-weight: 700; font-size: 18px;">Why Choose Our Product</div><p style="font-family: Arial; font-size: 14px; margin:6px 0;">${newWhyChoose.join(' ')}</p></div>`
    : '';
  
  return `<div style="text-align:left; font-family: Arial;">
  ${shortIntro}
  ${featuresList}${benefitsList}
  ${whyChooseDiv}
</div>
${getShipping(domain)}
<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Return</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
      <ul>
        <ul>
          <li>Easy Return Process – Simply send us a message and we will send you a return label as required.</li>
          <li>14-day Money Back Guarantee – if you change your mind and can return the item unopened.</li>
          <li>30-day Money Back Guarantee – in case item becomes faulty for any reason after purchase.</li>
          <li>No restocking fee - Buyer is responsible for delivery costs of the return if nothing is wrong with the item, if item arrived damaged a claim will be made with the courier.</li>
          <li>Refund processed within 5 working days of receiving the return.</li>
        </ul>
      </ul>
    </div>
  </div>
</div>
<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Feedback</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
      <p>Your feedback means everything to us. We would really appreciate it if you would leave us a 5 Star Review upon receiving your parcel, if for any reason you don’t feel we deserve 5 Stars please reach out first so we can learn from this experience.</p>
    </div>
  </div>
</div>
<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Contact Us</button>
  <div
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
      <p>For any questions, please reach out, we strive to reply 7 days a week to all customer messages same day.</p>
    </div>
  </div>
</div>
<div
  style="width: 100%; background-color: #fff !important;     color: #419f01 !important;     font-size: 35px !important;     font-weight: 700 !important;     padding-bottom: 20px;     padding-top: 20px;     text-align: center !important;">
  <p><span class="footerss" data-label="QjA4OTVGMUsySg==">Thank you for
      supporting our small family business!</span></p>
</div>`;
};

// Import VeRO alert handler
import { handleVeroAlert, setupVeroConfirmOverride, startVeroAlertMonitoring, startPostAIVeroMonitoring, waitForAndHandleVeroAlert } from './vero-alert-handler.js';

// Export VeRO handling functions for use in listing scripts
export { handleVeroAlert, setupVeroConfirmOverride, startVeroAlertMonitoring, startPostAIVeroMonitoring, waitForAndHandleVeroAlert };

// Build a fixed HTML listing template (left-aligned) and inject product data
export const buildFixedListingHtml = ({
  title = '',
  shortDescription = '',
  bullets = [], // for "Why Choose Our Product"
  features = [], // explicit Features list
  benefits = [], // explicit Benefits list
  featureImage = ''
}) => {
  const li = (t) => `<li>${t}</li>`;
  const bulletsHtml = (Array.isArray(bullets) ? bullets : []).slice(0, 8).map(li).join('');
  const featuresHtml = (Array.isArray(features) ? features : []).slice(0, 7).map(li).join('');
  const benefitsHtml = (Array.isArray(benefits) ? benefits : []).slice(0, 7).map(li).join('');
  const img = featureImage ? featureImage : 'https://via.placeholder.com/160x160?text=Features';
  return `<!-- =========================
     eBay Listing Sections (Left-aligned)
     Change heading color via --heading-color
     ========================= -->
<div style="max-width:960px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#1a1a1a;--heading-color:#d32f2f;text-align:left;">

  <!-- Title + Short Description -->
  <div style="margin:0 0 16px 0;">
    <h1 style="margin:0 0 6px 0;font-size:26px;color:#111;">${title}</h1>
    <p style="margin:0;color:#333;">${shortDescription}</p>
  </div>

  <!-- ===== Why Choose Our Product (Features & Benefits) ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 16px 0;">
    <tr>
      <td colspan="2" style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Why Choose Our Product
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;width:75%;text-align:left;">
        <ul style="margin:0;padding:0 0 0 18px;">
          ${bulletsHtml || `<li><strong>Durable build</strong> — long-lasting materials designed for everyday use.</li>
          <li><strong>Weather-resistant</strong> — reliable performance outdoors in varied conditions.</li>
          <li><strong>Compact & lightweight</strong> — easy to carry, store, and set up.</li>
          <li><strong>Simple to use</strong> — quick installation with clear instructions.</li>
          <li><strong>Wide compatibility</strong> — works with common setups/accessories.</li>
          <li><strong>High value</strong> — premium features at a wallet-friendly price.</li>
          <li><strong>Low maintenance</strong> — easy to clean and care for over time.</li>
          <li><strong>Friendly support</strong> — real help from our team when you need it.</li>`}
        </ul>
      </td>
      <td style="padding:14px;vertical-align:top;width:25%;text-align:left;">
        <img src="${img}" alt="Product features" style="display:block;width:100%;max-width:160px;height:auto;border:1px solid #e5e7eb;border-radius:8px;margin-left:auto;">
      </td>
    </tr>
  </table>

  <!-- ===== Features ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 16px 0;">
    <tr>
      <td style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Features
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;text-align:left;">
        <ul style="margin:0;padding:0 0 0 18px;">
          ${featuresHtml || '<li>See bullet list above</li>'}
        </ul>
      </td>
    </tr>
  </table>

  <!-- ===== Benefits ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 16px 0;">
    <tr>
      <td style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Benefits
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;text-align:left;">
        <ul style="margin:0;padding:0 0 0 18px;">
          ${benefitsHtml || '<li>See bullet list above</li>'}
        </ul>
      </td>
    </tr>
  </table>

  <!-- ===== Shipping ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 16px 0;text-align:left;">
    <tr>
      <td colspan="2" style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Shipping
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;width:75%;text-align:left;">
        <ul style="margin:0;padding:0 0 0 18px;">
          <li><strong>Free & Fast Delivery</strong> – Most UK orders arrive in 2–4 days; rare delays may take up to 3 weeks.</li>
          <li><strong>Alternative Carriers</strong> – Royal Mail, DPD, Evri, ParcelForce, Yodel, etc., used to ensure safe delivery.</li>
          <li><strong>Handling Time</strong> – Dispatched within 1 business day after cleared payment.</li>
        </ul>
      </td>
    </tr>
  </table>

  <!-- ===== Return ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 16px 0;text-align:left;">
    <tr>
      <td colspan="2" style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Return
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;width:75%;text-align:left;">
        <ul style="margin:0;padding:0 0 0 18px;">
          <li><strong>Easy process</strong> – Message us for a return label when required.</li>
          <li><strong>14-day Money Back</strong> – Change-of-mind returns accepted if unopened.</li>
          <li><strong>30-day Money Back</strong> – If the item becomes faulty after purchase.</li>
          <li><strong>No restocking fee</strong> – Buyer covers return shipping if there’s no fault; damaged items will be claimed with the courier.</li>
          <li><strong>Quick refunds</strong> – Processed within 5 working days of receipt.</li>
        </ul>
      </td>
    </tr>
  </table>

  <!-- ===== Feedback ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 16px 0;text-align:left;">
    <tr>
      <td colspan="2" style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Feedback
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;width:75%;text-align:left;">
        <p style="margin:0;">
          Your feedback means everything to us. We’d really appreciate a <strong>5-Star Review</strong> when your parcel arrives.
          If something isn’t perfect, please message us first so we can help.
        </p>
      </td>
    </tr>
  </table>

  <!-- ===== Contact Us ===== -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;text-align:left;">
    <tr>
      <td colspan="2" style="background:#d32f2f;background:var(--heading-color,#d32f2f);color:#fff;padding:10px 14px;font-weight:bold;font-size:18px;text-align:left;">
        Contact Us
      </td>
    </tr>
    <tr>
      <td style="padding:14px;vertical-align:top;width:75%;text-align:left;">
        <p style="margin:0;">
          Questions? Message us anytime — we aim to reply the same day, <strong>7 days a week</strong>.
        </p>
      </td>
    </tr>
  </table>

  <!-- Tip: Change heading color by editing --heading-color above, e.g. #1f3c88 -->
</div>`;
};
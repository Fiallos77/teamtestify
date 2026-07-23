export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-sm max-w-none space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4"><strong>Last Updated: January 2025</strong></p>
        </div>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Introduction</h2>
          <p>
            TeamTestify ("we," "us," "our," or "Company") operates the TeamTestify platform ("Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and application.
          </p>
          <p>
            We comply with the Australian Privacy Act 1988 (Australian Privacy Principles), the EU General Data Protection Regulation (GDPR), and applicable international data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Information You Provide Directly</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Account Information:</strong> name, email, password, organization name, location</li>
            <li><strong>Payment Information:</strong> billing address, payment method (processed by Stripe; we do not store card details)</li>
            <li><strong>Testimonials:</strong> client names, emails, text testimonials, video recordings, ratings</li>
            <li><strong>Configuration Data:</strong> brand colors, space settings, questions, email templates</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">2.2 Information Collected Automatically</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent, device type</li>
            <li><strong>Cookies & Tracking:</strong> We use essential cookies only; no marketing/tracking cookies</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">2.3 Third-Party Data</h3>
          <p>
            When you collect testimonials, your clients ("Testimonial Providers") submit their information to us. You are responsible for obtaining their consent before submitting their data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Service Delivery:</strong> operate the platform, process testimonials, generate marketing images</li>
            <li><strong>Communication:</strong> send account notifications, password resets, billing receipts (via Resend)</li>
            <li><strong>AI Processing:</strong> send testimonial text and metadata to Google Gemini API for headline/image generation</li>
            <li><strong>Payment Processing:</strong> process subscriptions via Stripe</li>
            <li><strong>Compliance:</strong> meet legal obligations, enforce Terms of Service</li>
            <li><strong>Security:</strong> detect and prevent fraud, unauthorized access, abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Retention</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Account Data:</strong> retained while your account is active, then deleted upon request or 30 days after account closure</li>
            <li><strong>Testimonials:</strong> retained for the duration of your subscription; deleted upon cancellation</li>
            <li><strong>Video Storage:</strong> stored on Convex (and potentially AWS R2); deleted upon your deletion or account closure</li>
            <li><strong>Payment Records:</strong> retained per tax and legal requirements (typically 7 years for Australia/GDPR compliance)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Sharing</h2>
          <p>We share data <strong>only</strong> with:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Service Providers:</strong> Google Gemini (headline/image generation), Stripe (payments), Resend (emails), Convex (storage)</li>
            <li><strong>Law Enforcement:</strong> when legally required by court order or applicable law</li>
            <li><strong>Successors:</strong> in case of acquisition or merger</li>
          </ul>
          <p className="mt-4">
            We do <strong>not</strong> sell, rent, or share your data with third parties for marketing.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Your Rights</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">6.1 Under GDPR (EU Residents)</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Right of access: request a copy of your data</li>
            <li>Right to rectification: correct inaccurate data</li>
            <li>Right to erasure: request deletion (with exceptions)</li>
            <li>Right to restrict processing: limit how we use your data</li>
            <li>Right to data portability: receive your data in machine-readable format</li>
            <li>Right to object: opt out of processing (where applicable)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">6.2 Under Privacy Act (Australia)</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Right to access: request information we hold about you</li>
            <li>Right to correction: request we correct inaccurate information</li>
            <li>Right to complain: lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">6.3 General</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Opt out of non-essential emails</li>
            <li>Delete your account and associated data</li>
          </ul>
          <p className="mt-4">
            To exercise any right, email <strong>support@teamtestify.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">7. Data Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>HTTPS encryption in transit</li>
            <li>Database encryption at rest</li>
            <li>Secure authentication (Better Auth)</li>
            <li>Regular security audits</li>
            <li>Restricted access to personal data</li>
          </ul>
          <p className="mt-4">
            <strong>No system is 100% secure.</strong> We are not liable for unauthorized access beyond our control.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">8. International Data Transfers</h2>
          <p>
            Your data may be stored or processed in multiple countries (Australia, US, EU) by our service providers. By using TeamTestify, you consent to these transfers. We ensure transfers comply with GDPR Standard Contractual Clauses where applicable.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">9. Third-Party Services</h2>
          <p>Our Service integrates with:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Google Gemini:</strong> processes testimonial text for image generation (review Google's privacy policy)</li>
            <li><strong>Stripe:</strong> processes payments (review Stripe's privacy policy)</li>
            <li><strong>Resend:</strong> sends emails (review Resend's privacy policy)</li>
          </ul>
          <p className="mt-4">
            We are not responsible for their privacy practices. Review their policies directly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">10. Children's Privacy</h2>
          <p>
            TeamTestify is not intended for users under 18. We do not knowingly collect data from minors. If we discover we have, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">11. Policy Changes</h2>
          <p>
            We may update this Privacy Policy at any time. Changes are effective upon posting to the website. Continued use of the Service constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">12. Contact Us</h2>
          <p><strong>Privacy Inquiries:</strong></p>
          <p>Email: support@teamtestify.com</p>
          <p><strong>GDPR Data Protection Officer (if applicable):</strong></p>
          <p>Email: privacy@teamtestify.com</p>
        </section>
      </div>
    </div>
  );
}

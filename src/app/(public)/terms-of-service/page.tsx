export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-sm max-w-none space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4"><strong>Last Updated: January 2025</strong></p>
        </div>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using TeamTestify ("Service," "Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. We reserve the right to modify these Terms at any time. Your continued use constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">2. Service Description</h2>
          <p>TeamTestify is a platform that allows users (the "Owner" or "Organization") to:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Create spaces to collect testimonials from clients or customers ("Testimonial Providers")</li>
            <li>Store and organize testimonials (text, video, ratings)</li>
            <li>Generate marketing images from testimonials using AI</li>
            <li>Embed widgets on their website to display testimonials</li>
          </ul>
          <p className="mt-4">
            The Service is provided "as is" without warranties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">3. User Eligibility</h2>
          <p>You must:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
            <li>Have the legal authority to enter into this Agreement</li>
            <li>Not be in violation of any applicable laws or regulations</li>
          </ul>
          <p className="mt-4">
            Organizations may only have <strong>one (1) paid account per organization</strong>. Creating multiple accounts to circumvent plan limits is prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Account Registration & Responsibility</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Account Creation</h3>
          <p>You are responsible for:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Providing accurate, current information during registration</li>
            <li>Maintaining the confidentiality of your password</li>
            <li>All activity under your account</li>
            <li>Notifying us immediately of unauthorized access</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Account Termination</h3>
          <p>You may delete your account at any time via the dashboard. Upon deletion:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Your account data will be retained per the Privacy Policy</li>
            <li>Published testimonials may take 24 hours to become inaccessible</li>
            <li>You remain liable for any actions taken under your account before deletion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Subscription Plans & Pricing</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">5.1 Free Plan</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>1 Space</li>
            <li>Up to 15 published testimonials</li>
            <li>3 AI image generations/month</li>
            <li>1 request generation/month</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">5.2 Pro Plan</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Up to 5 Spaces</li>
            <li>Unlimited published testimonials</li>
            <li>100 AI generations/month (combined image + request)</li>
            <li>No watermark on generated images</li>
            <li>Monthly or annual billing available</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">5.3 Billing & Cancellation</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Charges are billed in advance on the first day of each billing cycle</li>
            <li>All fees are exclusive of applicable taxes (GST/VAT/sales tax)</li>
            <li>You can cancel anytime via the billing portal; cancellation is effective at the end of your current billing period</li>
            <li><strong>Upon downgrade to Free:</strong> your 15 most recent approved testimonials remain published; all others are archived (not deleted)</li>
            <li><strong>No refunds</strong> for partial months or unused credits (except as required by law)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Testimonials & Data</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">6.1 Ownership</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>You retain ownership of testimonials you collect</li>
            <li>You grant TeamTestify a license to store, display, and process testimonials for the purpose of providing the Service</li>
            <li>You are responsible for obtaining written or verbal consent from Testimonial Providers before submitting their data</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">6.2 Testimonial Provider Consent</h3>
          <p>You warrant that:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>You have the legal right to collect and submit each testimonial</li>
            <li>Testimonial Providers consent to their data being stored, processed, and displayed on your public collection page</li>
            <li>You have shared applicable privacy notices with Testimonial Providers</li>
            <li>You comply with all applicable privacy laws (GDPR, Privacy Act, local laws)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">6.3 Content Restrictions</h3>
          <p>You must not submit:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Illegal content or content that violates third-party rights</li>
            <li>Defamatory, harassing, obscene, or hate speech</li>
            <li>Copyrighted material without permission</li>
            <li>Personally identifiable information (beyond what is necessary for the testimonial)</li>
          </ul>
          <p className="mt-4">
            We reserve the right to remove violating content and terminate your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">7. AI-Generated Content</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">7.1 Image Generation</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>AI generates headlines and selects layouts for testimonial images</li>
            <li>Generated images are owned by you; you may use, edit, or delete them</li>
            <li>We retain the right to use anonymized data to improve our AI models (you can opt out)</li>
            <li>Generated images may contain watermarks (on Free plan)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">7.2 AI Limitations</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>AI-generated content may be inaccurate or inappropriate</li>
            <li>We are not liable for errors, omissions, or issues with AI-generated content</li>
            <li>You are solely responsible for reviewing and approving content before publishing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">8. Payments & Refunds</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">8.1 Payment Terms</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Payments are processed via Stripe and are non-refundable</li>
            <li>Failed payments will result in service suspension after 3 days</li>
            <li>Late fees (if applicable) will be added per your billing agreement</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">8.2 Taxes</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>You are responsible for any taxes, duties, or levies applicable in your jurisdiction</li>
            <li>We will collect and remit sales tax/GST/VAT as required by law</li>
            <li>If you claim tax-exempt status, you must provide valid documentation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">9. Warranty Disclaimer</h2>
          <p>
            <strong>The Service is provided "as-is" without warranties of any kind.</strong> We disclaim all express and implied warranties, including:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Merchantability, fitness for a particular purpose, non-infringement</li>
            <li>Uninterrupted or error-free operation</li>
            <li>The accuracy or reliability of AI-generated content</li>
            <li>Availability of third-party services (Gemini, Stripe, Resend)</li>
          </ul>
          <p className="mt-4">
            We do not warrant that the Service will meet your requirements or that defects will be corrected.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">10. Limitation of Liability</h2>
          <p>
            <strong>To the maximum extent permitted by law:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>We are not liable for indirect, incidental, consequential, or punitive damages</li>
            <li>We are not liable for loss of profits, revenue, data, or business opportunities</li>
            <li>Our total liability under this Agreement shall not exceed the fees you paid in the 12 months preceding the claim</li>
          </ul>
          <p className="mt-4">
            <strong>Exceptions:</strong> This limitation does not apply to:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Death or personal injury caused by our negligence</li>
            <li>Fraud or willful misconduct</li>
            <li>Liability that cannot be excluded by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">11. Prohibited Uses</h2>
          <p>You must not:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Use the Service for illegal purposes or in violation of any law</li>
            <li>Attempt to gain unauthorized access to our systems (hacking, SQL injection, etc.)</li>
            <li>Reverse-engineer, decompile, or disassemble the Service</li>
            <li>Use bots, scrapers, or automated tools to access the Service without permission</li>
            <li>Harass, abuse, or threaten other users or our staff</li>
            <li>Spam or send unsolicited communications</li>
            <li>Interfere with the Service's normal operation</li>
            <li>Resell or redistribute access to the Service</li>
          </ul>
          <p className="mt-4">
            <strong>Violation may result in immediate account termination and legal action.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">12. Intellectual Property</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You retain ownership of your testimonials and branding</li>
            <li>TeamTestify retains ownership of the platform, code, designs, and trademarks</li>
            <li>You grant us a non-exclusive license to use your data solely to provide the Service</li>
            <li>You may not use our trademarks or branding without written permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">13. Third-Party Services</h2>
          <p>
            The Service integrates with third-party providers: Google Gemini, Stripe, Resend, Convex, and Pexels.
          </p>
          <p>
            We are not responsible for their services, outages, or privacy practices. You use them at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">14. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless TeamTestify from any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Your use of the Service</li>
            <li>Your violation of this Agreement</li>
            <li>Your testimonials or data violating third-party rights</li>
            <li>Your violation of applicable laws</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">15. Termination</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">15.1 By You</h3>
          <p>
            You may terminate your account anytime by deleting it via the dashboard.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">15.2 By Us</h3>
          <p>We may terminate or suspend your account immediately if:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>You violate this Agreement</li>
            <li>You engage in illegal activity or abuse</li>
            <li>Your payment fails and is not resolved within 3 days</li>
            <li>You create multiple accounts to circumvent plan limits</li>
          </ul>
          <p className="mt-4">
            Upon termination by us, you forfeit access to the Service and any unpaid refunds.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">16. Governing Law & Jurisdiction</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Governing Law:</strong> These Terms are governed by the laws of Australia (New South Wales), without regard to conflicts of law</li>
            <li><strong>Dispute Resolution:</strong> Any dispute shall be resolved under the laws of your jurisdiction</li>
            <li><strong>Small Claims:</strong> For claims under AUD $10,000, either party may pursue resolution in small claims court</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">17. Contact Us</h2>
          <p><strong>For support or inquiries:</strong></p>
          <p>Email: support@teamtestify.com</p>
          <p>Website: www.teamtestify.com</p>
        </section>
      </div>
    </div>
  );
}

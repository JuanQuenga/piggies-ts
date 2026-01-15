import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/legal')({
  component: LegalPage,
})

function LegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/login">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </Link>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/10 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-pink-400 rounded-xl flex items-center justify-center">
              <img
                src="/pig-snout.svg"
                alt="Piggies"
                className="w-7 h-7 brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                Piggies
              </h1>
              <p className="text-gray-500 text-sm">Terms of Service & Privacy Policy</p>
            </div>
          </div>

          <p className="text-gray-600 mb-8">
            <strong>Last Updated:</strong> January 2025
          </p>

          <div className="space-y-6 text-gray-900">
            {/* TABLE OF CONTENTS */}
            <div className="bg-gray-100 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold mt-0 mb-4 text-gray-900">Contents</h2>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <a href="#terms" className="text-primary hover:underline">1. Terms of Service</a>
                <a href="#privacy" className="text-primary hover:underline">2. Privacy Policy</a>
                <a href="#eligibility" className="text-primary hover:underline">1.1 Eligibility</a>
                <a href="#data-collection" className="text-primary hover:underline">2.1 Data We Collect</a>
                <a href="#account" className="text-primary hover:underline">1.2 Your Account</a>
                <a href="#data-use" className="text-primary hover:underline">2.2 How We Use Your Data</a>
                <a href="#conduct" className="text-primary hover:underline">1.3 User Conduct</a>
                <a href="#data-sharing" className="text-primary hover:underline">2.3 Data Sharing</a>
                <a href="#content" className="text-primary hover:underline">1.4 User Content</a>
                <a href="#data-retention" className="text-primary hover:underline">2.4 Data Retention</a>
                <a href="#subscriptions" className="text-primary hover:underline">1.5 Subscriptions</a>
                <a href="#your-rights" className="text-primary hover:underline">2.5 Your Rights</a>
                <a href="#safety" className="text-primary hover:underline">1.6 Safety & Moderation</a>
                <a href="#cookies" className="text-primary hover:underline">2.6 Cookies & Storage</a>
                <a href="#termination" className="text-primary hover:underline">1.7 Termination</a>
                <a href="#security" className="text-primary hover:underline">2.7 Security</a>
                <a href="#disclaimers" className="text-primary hover:underline">1.8 Disclaimers</a>
                <a href="#contact" className="text-primary hover:underline">3. Contact Us</a>
              </div>
            </div>

            {/* TERMS OF SERVICE */}
            <section id="terms" className="space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">1. Terms of Service</h2>

              <p className="leading-relaxed">
                Welcome to Piggies. By accessing or using our service, you agree to be bound by these Terms of Service
                and our Privacy Policy. If you do not agree to these terms, please do not use Piggies.
              </p>

              <h3 id="eligibility" className="text-xl font-semibold pt-4">1.1 Eligibility</h3>
              <p className="leading-relaxed">To use Piggies, you must:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into a binding agreement</li>
                <li>Not be prohibited from using the service under applicable law</li>
                <li>Not have been previously banned or removed from Piggies</li>
              </ul>

              <h3 id="account" className="text-xl font-semibold pt-4">1.2 Your Account</h3>
              <p className="leading-relaxed">When you create an account, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide accurate and truthful information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly update any information that changes</li>
                <li>Accept responsibility for all activity under your account</li>
                <li>Not create multiple accounts or share your account with others</li>
              </ul>

              <h3 id="conduct" className="text-xl font-semibold pt-4">1.3 User Conduct</h3>
              <p className="leading-relaxed">You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Harass, bully, stalk, threaten, or intimidate other users</li>
                <li>Post content depicting minors or any illegal content</li>
                <li>Impersonate another person or misrepresent your identity</li>
                <li>Use the service for commercial purposes or solicitation</li>
                <li>Distribute spam, malware, or engage in phishing</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Scrape, crawl, or use automated means to access the service</li>
                <li>Attempt to circumvent any security features</li>
                <li>Share content that promotes hatred or discrimination</li>
                <li>Engage in any activity that could harm the service or other users</li>
              </ul>

              <h3 id="content" className="text-xl font-semibold pt-4">1.4 User Content</h3>
              <p className="leading-relaxed">
                You retain ownership of content you post to Piggies. By posting content, you grant us a non-exclusive,
                royalty-free, worldwide license to use, display, and distribute your content in connection with the service.
              </p>
              <p className="leading-relaxed">You represent that:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You own or have the right to share all content you post</li>
                <li>Your content does not violate the rights of others</li>
                <li>Your photos accurately represent you (for profile photos)</li>
              </ul>
              <p className="leading-relaxed">
                We reserve the right to remove any content that violates these terms or is otherwise objectionable,
                at our sole discretion.
              </p>

              <h3 id="subscriptions" className="text-xl font-semibold pt-4">1.5 Subscriptions & Payments</h3>
              <p className="leading-relaxed">
                Piggies offers free and premium subscription tiers. Premium subscriptions (Ultra) provide enhanced features.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Billing:</strong> Subscriptions are billed through our payment processor, Polar. By subscribing, you authorize recurring charges.</li>
                <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Access continues until the end of the billing period.</li>
                <li><strong>Refunds:</strong> Refunds are handled on a case-by-case basis. Contact us for refund requests.</li>
                <li><strong>Price Changes:</strong> We may change subscription prices with reasonable notice.</li>
                <li><strong>Referral Program:</strong> Earn rewards by referring new users. Abuse of the referral program may result in account termination.</li>
              </ul>

              <h3 id="safety" className="text-xl font-semibold pt-4">1.6 Safety & Moderation</h3>
              <p className="leading-relaxed">
                We are committed to maintaining a safe environment. We may take action, including warnings, suspensions,
                or permanent bans, against users who violate these terms or engage in harmful behavior.
              </p>
              <p className="leading-relaxed">
                We encourage users to report any violations or concerns through our reporting system. We review all reports
                and take appropriate action.
              </p>

              <h3 id="termination" className="text-xl font-semibold pt-4">1.7 Termination</h3>
              <p className="leading-relaxed">
                You may delete your account at any time through your account settings. We may suspend or terminate your
                account for violations of these terms, suspicious activity, or extended inactivity.
              </p>
              <p className="leading-relaxed">
                Upon termination, your right to use the service ceases immediately. We may retain certain data as required
                by law or for legitimate business purposes.
              </p>

              <h3 id="disclaimers" className="text-xl font-semibold pt-4">1.8 Disclaimers & Limitations</h3>
              <p className="leading-relaxed">
                <strong>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> We do not guarantee
                compatibility with other users or that the service will meet your expectations.
              </p>
              <p className="leading-relaxed">
                <strong>LIMITATION OF LIABILITY:</strong> To the maximum extent permitted by law, Piggies shall not be
                liable for any indirect, incidental, special, consequential, or punitive damages arising from your use
                of the service.
              </p>
              <p className="leading-relaxed">
                <strong>USER INTERACTIONS:</strong> You are solely responsible for your interactions with other users.
                We do not conduct background checks and cannot guarantee the identity or conduct of users.
              </p>
            </section>

            <hr className="my-8 border-gray-200" />

            {/* PRIVACY POLICY */}
            <section id="privacy" className="space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">2. Privacy Policy</h2>

              <p className="leading-relaxed">
                This Privacy Policy describes how we collect, use, and protect your personal information when you use Piggies.
              </p>

              <h3 id="data-collection" className="text-xl font-semibold pt-4">2.1 Information We Collect</h3>

              <h4 className="font-semibold pt-2">Information You Provide:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Account Information:</strong> Email address, name, and authentication data when you sign up via our authentication provider (WorkOS)</li>
                <li><strong>Profile Information:</strong> Display name, age, biography, photos, interests, and "looking for" preferences</li>
                <li><strong>Location Data:</strong> Your location (when you choose to share it) to enable discovery features</li>
                <li><strong>Communications:</strong> Messages you send to other users</li>
                <li><strong>Payment Information:</strong> Processed securely by Polar; we do not store your payment card details</li>
              </ul>

              <h4 className="font-semibold pt-2">Information Collected Automatically:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Usage Data:</strong> How you interact with the service, including profile views, waves sent, and feature usage</li>
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
                <li><strong>Activity Status:</strong> Your online/offline status and last active time</li>
              </ul>

              <h3 id="data-use" className="text-xl font-semibold pt-4">2.2 How We Use Your Information</h3>
              <p className="leading-relaxed">We use your information to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide, maintain, and improve the service</li>
                <li>Enable you to discover and connect with other users</li>
                <li>Process your transactions and manage subscriptions</li>
                <li>Send service-related communications (account verification, security alerts)</li>
                <li>Enforce our terms and protect against fraud and abuse</li>
                <li>Respond to your requests and provide customer support</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>

              <h3 id="data-sharing" className="text-xl font-semibold pt-4">2.3 Information Sharing</h3>
              <p className="leading-relaxed">We share your information with:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Other Users:</strong> Your profile information, photos, and content you choose to share are visible to other users based on your privacy settings</li>
                <li><strong>Service Providers:</strong>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-1">
                    <li><strong>WorkOS:</strong> Authentication services</li>
                    <li><strong>Convex:</strong> Database and backend infrastructure</li>
                    <li><strong>Polar:</strong> Payment processing</li>
                    <li><strong>Giphy:</strong> GIF search functionality (search queries only)</li>
                  </ul>
                </li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Safety:</strong> To protect the rights, property, or safety of Piggies, our users, or others</li>
              </ul>
              <p className="leading-relaxed">
                <strong>We do not sell your personal information to third parties.</strong>
              </p>

              <h3 id="data-retention" className="text-xl font-semibold pt-4">2.4 Data Retention</h3>
              <p className="leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide services.
                After account deletion:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Profile information and photos are deleted</li>
                <li>Messages may be retained for safety and legal compliance</li>
                <li>Aggregated, anonymized data may be retained indefinitely</li>
                <li>Some data may be retained as required by law</li>
              </ul>

              <h3 id="your-rights" className="text-xl font-semibold pt-4">2.5 Your Rights & Choices</h3>
              <p className="leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Delete your account and personal data</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Opt-out:</strong> Disable certain features like location sharing or online status visibility in settings</li>
              </ul>
              <p className="leading-relaxed">
                To exercise these rights, contact us or use the settings within the app.
              </p>

              <h3 id="cookies" className="text-xl font-semibold pt-4">2.6 Cookies & Local Storage</h3>
              <p className="leading-relaxed">
                Piggies uses essential cookies and local storage technologies that are strictly necessary for the
                service to function. These include:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Authentication Cookies:</strong> To keep you signed in and secure your session</li>
                <li><strong>Preference Storage:</strong> To remember your settings and preferences</li>
              </ul>
              <p className="leading-relaxed">
                <strong>We do not use tracking cookies, advertising cookies, or third-party analytics cookies.</strong>{' '}
                Because we only use strictly necessary cookies for the operation of the service, no cookie consent
                banner is required.
              </p>

              <h3 id="security" className="text-xl font-semibold pt-4">2.7 Security</h3>
              <p className="leading-relaxed">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure authentication through WorkOS</li>
                <li>Access controls and monitoring</li>
              </ul>
              <p className="leading-relaxed">
                However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security
                of your data.
              </p>

              <h3 className="text-xl font-semibold pt-4">2.8 Children's Privacy</h3>
              <p className="leading-relaxed">
                Piggies is not intended for users under 18 years of age. We do not knowingly collect information
                from children. If we learn that we have collected information from a child under 18, we will
                promptly delete that information.
              </p>

              <h3 className="text-xl font-semibold pt-4">2.9 International Users</h3>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. By using
                Piggies, you consent to such transfers. We take appropriate safeguards to protect your information
                in accordance with this Privacy Policy.
              </p>

              <h3 className="text-xl font-semibold pt-4">2.10 Changes to This Policy</h3>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by
                posting the new policy on this page and updating the "Last Updated" date. Your continued use of
                the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <hr className="my-8 border-gray-200" />

            {/* CONTACT */}
            <section id="contact" className="space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">3. Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about these Terms of Service or Privacy Policy, or if you wish to
                exercise your data rights, please contact us at:
              </p>
              <p className="bg-gray-100 rounded-lg p-4">
                <strong>Email:</strong> support@piggies.us
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Piggies. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

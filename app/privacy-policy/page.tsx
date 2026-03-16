'use client';


import { useEffect } from "react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-slate-50">
      <div className="py-20 px-6 sm:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
          <header className="mb-10 text-center md:text-left border-b border-slate-100 pb-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-2">Legal Information</h2>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">Agreement on Privacy Policy</h1>
            <p className="mt-4 text-slate-400 font-medium italic text-sm">Last updated: February 29, 2024</p>
          </header>

          <article className="prose prose-slate max-w-none text-slate-600 space-y-8 leading-relaxed">
            <section>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide mb-4">Privacy Policy</h3>
              <p>
                This Privacy Policy governs the manner in which PT Indonesia Creative Technology ("we" or "our") collects, uses, maintains, and discloses information collected from users ("users" or "you") of the Live Photo website (<a href="https://livephoto.id/" className="text-indigo-600 hover:underline">https://livephoto.id/</a>) and any related digital products and services.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Information Collection</h3>
              <p>
                We may collect personal identification information from users in various ways, including but not limited to when users visit our website, register on the site, place an order, subscribe to our newsletter, respond to a survey, fill out a form, and in connection with other activities, services, features, or resources we make available on our website. Users may be asked for their name, email address, mailing address, phone number, and other relevant information.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Information Usage</h3>
              <p>We may collect and use users' personal information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-3 mt-4">
                <li><span className="font-bold text-slate-800">To improve customer service:</span> Information you provide helps us respond to your customer service requests and support needs more efficiently.</li>
                <li><span className="font-bold text-slate-800">To personalize user experience:</span> We may use information in the aggregate to understand how our users as a group use the services and resources provided on our website.</li>
                <li><span className="font-bold text-slate-800">To improve our website:</span> We continually strive to improve our website offerings based on the information and feedback we receive from users.</li>
                <li><span className="font-bold text-slate-800">To process transactions:</span> We may use the information users provide about themselves when placing an order only to provide service to that order. We do not share this information with outside parties except to the extent necessary to provide the service.</li>
                <li><span className="font-bold text-slate-800">To send periodic emails:</span> We may use the email address to send users information and updates pertaining to their order. It may also be used to respond to their inquiries, questions, and/or other requests. If a user decides to opt-in to our mailing list, they will receive emails that may include company news, updates, related product or service information, etc.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Information Protection</h3>
              <p>
                We adopt appropriate data collection, storage, and processing practices and security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information, username, password, transaction information, and data stored on our website.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Sharing Personal Information</h3>
              <p>
                We do not sell, trade, or rent users' personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates, and advertisers for the purposes outlined above.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Compliance with Laws</h3>
              <p>
                We will disclose your personal information where required to do so by law or subpoena or if we believe that such action is necessary to comply with the law and the reasonable requests of law enforcement or to protect the security or integrity of our website.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Changes to this Privacy Policy</h3>
              <p>
                PT Indonesia Creative Technology has the discretion to update this Privacy Policy at any time. When we do, we will revise the updated date at the bottom of this page. We encourage users to frequently check this page for any changes to stay informed about how we are helping to protect the personal information we collect. You acknowledge and agree that it is your responsibility to review this Privacy Policy periodically and become aware of modifications.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Your Acceptance of These Terms</h3>
              <p>
                By using our website, you signify your acceptance of this Privacy Policy. If you do not agree to this Privacy Policy, please do not use our website. Your continued use of the website following the posting of changes to this Privacy Policy will be deemed your acceptance of those changes.
              </p>
            </section>

            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Contacting Us</h3>
              <p>
                If you have any questions about this Privacy Policy, the practices of this website, or your dealings with this website, please contact us at:
              </p>
              <p className="mt-4 font-bold text-slate-900">
                Email: <a href="mailto:admin@livephoto.id" className="text-indigo-600 hover:underline">admin@livephoto.id</a>
              </p>
            </section>
          </article>
        </div>
      </div>


    </main>
  );
}

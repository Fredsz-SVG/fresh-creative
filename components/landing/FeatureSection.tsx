export default function FeatureSection() {
  return (
    <section id="features" className="landing-features scroll-mt-16">
      <h2 className="landing-features__title">
        Features built for online yearbook
      </h2>

      <p className="landing-features__subtitle">
        Create, manage, and share digital yearbooks easily for schools,
        communities, and events — all in one platform.
      </p>

      <div className="landing-features__grid">
        <div className="landing-features__card">
          <h3 className="landing-features__card-title">
            Student Profile Pages
          </h3>
          <p className="landing-features__card-desc">
            Each student gets a personal page with photo, bio, quotes,
            and memorable moments.
          </p>
        </div>

        <div className="landing-features__card">
          <h3 className="landing-features__card-title">
            Class & Album Management
          </h3>
          <p className="landing-features__card-desc">
            Organize students by class, batch, or event with structured
            album management.
          </p>
        </div>

        <div className="landing-features__card">
          <h3 className="landing-features__card-title">
            Share & Publish Online
          </h3>
          <p className="landing-features__card-desc">
            Publish yearbooks online with shareable links that work
            across all devices.
          </p>
        </div>
      </div>
    </section>
  )
}

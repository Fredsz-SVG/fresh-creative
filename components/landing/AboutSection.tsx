export default function AboutSection() {
  return (
    <section id="about" className="landing-about scroll-mt-16">
      <div className="landing-about__container">
        {/* Text */}
        <div>
          <p className="landing-about__eyebrow">About platform</p>
          <h2 className="landing-about__title">
            A modern way to create digital yearbooks
          </h2>

          <p className="landing-about__desc">
            Yearbook Online is a web-based platform that helps schools,
            communities, and organizations create beautiful digital
            yearbooks without the complexity of traditional printing
            and manual layouts.
          </p>

          <ul className="landing-about__list">
            <li className="landing-about__item">
              <span className="landing-about__icon" />
              Centralized student profiles with photos, bios, and memories
            </li>
            <li className="landing-about__item">
              <span className="landing-about__icon" />
              Easy collaboration between admins, teachers, and students
            </li>
            <li className="landing-about__item">
              <span className="landing-about__icon" />
              Accessible anytime through secure online links
            </li>
          </ul>
        </div>

        {/* Visual / Stats */}
        <div className="landing-about__card">
          <div className="landing-about__stat">
            <span className="landing-about__stat-label">
              Yearbooks published
            </span>
            <span className="landing-about__stat-value">250+</span>
          </div>

          <div className="landing-about__stat">
            <span className="landing-about__stat-label">
              Schools & communities
            </span>
            <span className="landing-about__stat-value">80+</span>
          </div>

          <div className="landing-about__stat">
            <span className="landing-about__stat-label">
              Students featured
            </span>
            <span className="landing-about__stat-value">45K+</span>
          </div>
        </div>
      </div>
    </section>
  )
}

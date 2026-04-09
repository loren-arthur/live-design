const styles = {
  hero: {
    minHeight: "90vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: "4rem 1.5rem",
    background: "linear-gradient(135deg, var(--brand-bg) 0%, var(--brand-bg-alt) 100%)",
    position: "relative" as const,
    overflow: "hidden",
  },
  glow: {
    position: "absolute" as const,
    width: "40rem",
    height: "40rem",
    borderRadius: "50%",
    background: "var(--brand-primary)",
    opacity: 0.06,
    filter: "blur(80px)",
    top: "-10rem",
    right: "-10rem",
    pointerEvents: "none" as const,
  },
  content: {
    maxWidth: "48rem",
    position: "relative" as const,
    zIndex: 1,
  },
  badge: {
    display: "inline-block",
    padding: "0.375rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--brand-primary)",
    background: "rgba(99, 102, 241, 0.08)",
    borderRadius: "999px",
    marginBottom: "1.5rem",
    letterSpacing: "0.025em",
  },
  headline: {
    fontSize: "clamp(2.5rem, 5vw, 4rem)",
    fontWeight: 700,
    lineHeight: 1.1,
    color: "var(--brand-text)",
    marginBottom: "1.5rem",
    letterSpacing: "-0.025em",
  },
  accent: {
    background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "1.25rem",
    color: "var(--brand-text-muted)",
    maxWidth: "36rem",
    margin: "0 auto 2.5rem",
    lineHeight: 1.7,
  },
  buttons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
} as const;

export default function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.glow} />
      <div style={styles.content}>
        <span style={styles.badge}>Now in Beta</span>
        <h1 style={styles.headline}>
          Ship products{" "}
          <span style={styles.accent}>people love</span>
        </h1>
        <p style={styles.subtitle}>
          Launchpad gives your team the analytics, feedback tools, and deployment
          pipeline to go from idea to production — faster than ever.
        </p>
        <div style={styles.buttons}>
          <a href="#pricing" className="btn btn-primary">
            Get Started Free
          </a>
          <a href="#features" className="btn btn-secondary">
            See Features
          </a>
        </div>
      </div>
    </section>
  );
}

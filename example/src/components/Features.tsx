const features = [
  {
    icon: "\u{1F4CA}",
    title: "Real-time Analytics",
    description:
      "Track every metric that matters. Funnel analysis, cohort reports, and live dashboards — all in one place.",
  },
  {
    icon: "\u{1F680}",
    title: "One-click Deploy",
    description:
      "Push to production with confidence. Automated rollbacks, canary releases, and zero-downtime deployments.",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "Built-in Security",
    description:
      "SOC2-ready out of the box. Role-based access, audit logs, and encrypted data at rest and in transit.",
  },
  {
    icon: "\u{1F4AC}",
    title: "User Feedback",
    description:
      "Collect and organize user feedback directly in your workflow. Prioritize what your users actually want.",
  },
  {
    icon: "\u{26A1}",
    title: "Edge Functions",
    description:
      "Run serverless code at the edge with sub-millisecond cold starts. Deploy globally in seconds.",
  },
  {
    icon: "\u{1F504}",
    title: "CI/CD Pipelines",
    description:
      "Automate your entire build, test, and release workflow. Integrate with GitHub, GitLab, and Bitbucket.",
  },
];

const styles = {
  section: {
    padding: "6rem 1.5rem",
    maxWidth: "72rem",
    margin: "0 auto",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "4rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--brand-primary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "var(--brand-text)",
    marginBottom: "1rem",
    letterSpacing: "-0.025em",
  },
  description: {
    fontSize: "1.125rem",
    color: "var(--brand-text-muted)",
    maxWidth: "32rem",
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
    gap: "2rem",
  },
  card: {
    padding: "2rem",
    borderRadius: "var(--brand-radius)",
    border: "1px solid var(--brand-border)",
    background: "var(--brand-bg)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    cursor: "default",
  },
  cardIcon: {
    fontSize: "2rem",
    marginBottom: "1rem",
    display: "block",
  },
  cardTitle: {
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "var(--brand-text)",
    marginBottom: "0.5rem",
  },
  cardDesc: {
    fontSize: "0.9375rem",
    color: "var(--brand-text-muted)",
    lineHeight: 1.6,
  },
} as const;

export default function Features() {
  return (
    <section id="features" style={styles.section}>
      <div style={styles.header}>
        <p style={styles.label}>Features</p>
        <h2 style={styles.title}>Everything you need to launch</h2>
        <p style={styles.description}>
          A complete toolkit for modern product teams. No glue code required.
        </p>
      </div>
      <div style={styles.grid}>
        {features.map((f) => (
          <div
            key={f.title}
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(0, 0, 0, 0.08)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span style={styles.cardIcon}>{f.icon}</span>
            <h3 style={styles.cardTitle}>{f.title}</h3>
            <p style={styles.cardDesc}>{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

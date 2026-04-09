interface PlanProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

function PlanCard({ name, price, period, description, features, cta, highlighted }: PlanProps) {
  return (
    <div
      style={{
        flex: "1 1 20rem",
        maxWidth: "28rem",
        padding: "2.5rem",
        borderRadius: "var(--brand-radius)",
        border: highlighted
          ? "2px solid var(--brand-primary)"
          : "1px solid var(--brand-border)",
        background: highlighted
          ? "linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, var(--brand-bg) 100%)"
          : "var(--brand-bg)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxShadow: highlighted
          ? "0 8px 32px rgba(99, 102, 241, 0.12)"
          : "0 1px 4px rgba(0, 0, 0, 0.04)",
      }}
    >
      {highlighted && (
        <span
          style={{
            position: "absolute",
            top: "-0.75rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--brand-primary)",
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: 600,
            padding: "0.25rem 1rem",
            borderRadius: "999px",
            letterSpacing: "0.03em",
          }}
        >
          Most Popular
        </span>
      )}
      <h3
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--brand-text)",
          marginBottom: "0.5rem",
        }}
      >
        {name}
      </h3>
      <p
        style={{
          fontSize: "0.9375rem",
          color: "var(--brand-text-muted)",
          marginBottom: "1.5rem",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      <div style={{ marginBottom: "2rem" }}>
        <span
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            color: "var(--brand-text)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {price}
        </span>
        <span
          style={{
            fontSize: "1rem",
            color: "var(--brand-text-muted)",
            marginLeft: "0.25rem",
          }}
        >
          {period}
        </span>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 2rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {features.map((feature) => (
          <li
            key={feature}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
              fontSize: "0.9375rem",
              color: "var(--brand-text)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                color: "var(--brand-primary)",
                fontWeight: 700,
                flexShrink: 0,
                marginTop: "0.125rem",
              }}
            >
              {"\u2713"}
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        className={highlighted ? "btn btn-primary" : "btn btn-secondary"}
        style={{ width: "100%" }}
      >
        {cta}
      </button>
    </div>
  );
}

const styles = {
  section: {
    padding: "6rem 1.5rem",
    maxWidth: "72rem",
    margin: "0 auto",
    background: "var(--brand-bg-alt)",
  },
  wrapper: {
    maxWidth: "72rem",
    margin: "0 auto",
    padding: "0 1.5rem",
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
  cards: {
    display: "flex",
    gap: "2rem",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
} as const;

export default function Pricing() {
  return (
    <section id="pricing" style={styles.section}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <p style={styles.label}>Pricing</p>
          <h2 style={styles.title}>Start free, scale when ready</h2>
          <p style={styles.description}>
            No credit card required. Upgrade when your team needs more.
          </p>
        </div>
        <div style={styles.cards}>
          <PlanCard
            name="Free"
            price="$0"
            period="/month"
            description="For individuals and small side projects."
            features={[
              "Up to 3 projects",
              "1,000 events / month",
              "Community support",
              "Basic analytics",
              "1 team member",
            ]}
            cta="Get Started"
          />
          <PlanCard
            name="Pro"
            price="$29"
            period="/month"
            description="For teams shipping real products."
            features={[
              "Unlimited projects",
              "100,000 events / month",
              "Priority support",
              "Advanced analytics",
              "Unlimited team members",
              "Custom domains",
              "CI/CD integrations",
            ]}
            cta="Start Free Trial"
            highlighted
          />
        </div>
      </div>
    </section>
  );
}

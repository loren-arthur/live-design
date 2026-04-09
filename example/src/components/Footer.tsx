const columns = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Docs"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Press"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "GDPR"],
  },
];

const styles = {
  footer: {
    borderTop: "1px solid var(--brand-border)",
    padding: "4rem 1.5rem 2rem",
    background: "var(--brand-bg)",
  },
  inner: {
    maxWidth: "72rem",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "3rem",
    justifyContent: "space-between",
  },
  brand: {
    flex: "1 1 16rem",
    marginBottom: "1rem",
  },
  logo: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--brand-text)",
    marginBottom: "0.75rem",
  },
  logoAccent: {
    color: "var(--brand-primary)",
  },
  tagline: {
    fontSize: "0.9375rem",
    color: "var(--brand-text-muted)",
    lineHeight: 1.6,
    maxWidth: "20rem",
  },
  column: {
    flex: "0 0 auto",
    minWidth: "8rem",
  },
  columnTitle: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--brand-text)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "1rem",
  },
  linkList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  link: {
    fontSize: "0.9375rem",
    color: "var(--brand-text-muted)",
    textDecoration: "none",
    transition: "color 0.15s",
  },
  divider: {
    borderTop: "1px solid var(--brand-border)",
    marginTop: "3rem",
    paddingTop: "1.5rem",
    maxWidth: "72rem",
    margin: "3rem auto 0",
    padding: "1.5rem 1.5rem 0",
  },
  copyright: {
    fontSize: "0.8125rem",
    color: "var(--brand-text-muted)",
    textAlign: "center" as const,
  },
} as const;

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <div style={styles.logo}>
            <span style={styles.logoAccent}>Launch</span>pad
          </div>
          <p style={styles.tagline}>
            The modern platform for product teams who move fast and ship with
            confidence.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} style={styles.column}>
            <h4 style={styles.columnTitle}>{col.title}</h4>
            <ul style={styles.linkList}>
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    style={styles.link}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--brand-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--brand-text-muted)")
                    }
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={styles.divider}>
        <p style={styles.copyright}>
          &copy; 2026 Launchpad. All rights reserved. Built with live-design.
        </p>
      </div>
    </footer>
  );
}

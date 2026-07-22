import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "24px",
            margin: "12px",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            background: "rgba(239,68,68,0.08)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#f87171", fontSize: "14px", fontWeight: 600, margin: "0 0 8px" }}>
            {this.props.name || "Component"} crashed
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "0 0 12px", wordBreak: "break-word" }}>
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 16px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Info, AlertTriangle, Lightbulb, Ban } from "lucide-react";

const CALLOUT_TYPES = {
  info: { icon: Info, label: "Info" },
  warning: { icon: AlertTriangle, label: "Warning" },
  tip: { icon: Lightbulb, label: "Tip" },
  danger: { icon: Ban, label: "Danger" },
} as const;

type CalloutType = keyof typeof CALLOUT_TYPES;

interface Props {
  type?: CalloutType;
  children?: string;
}

export function CalloutBlock({ type = "info", children = "Callout content" }: Props) {
  const config = CALLOUT_TYPES[type];
  const Icon = config.icon;
  return (
    <div className={`graphite-callout graphite-callout--${type}`}>
      <Icon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

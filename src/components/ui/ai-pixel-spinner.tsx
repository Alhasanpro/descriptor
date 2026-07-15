type AIPixelSpinnerProps = {
  className?: string;
  label?: string;
};

export function AIPixelSpinner({ className = "", label }: AIPixelSpinnerProps) {
  const classes = ["ai-pixel-spinner", className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={`ai-pixel-spinner__cell ai-pixel-spinner__cell--${index}`}
        />
      ))}
    </span>
  );
}

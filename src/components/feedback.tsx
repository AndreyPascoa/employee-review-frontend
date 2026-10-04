import { Icon } from "./icon";
export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
export function Failure({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      <Icon name="info" />
      <div>
        <p>{message}</p>
        {retry && (
          <button type="button" className="text-button" onClick={retry}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

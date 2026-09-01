export function LoadingSpinner() {
  return (
    <div className="loading-screen" role="status">
      <span className="loading-mark" aria-hidden="true">OV</span>
      <span>Reading engineering history…</span>
    </div>
  )
}

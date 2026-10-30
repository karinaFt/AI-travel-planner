import { useNavigate } from 'react-router'

/** Stands in for the browser's Back button. */
export function HistoryBack() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Test back
    </button>
  )
}

export default function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-accent-green/20 text-accent-green',
    pending: 'bg-accent-yellow/20 text-accent-yellow',
    generating: 'bg-accent-blue/20 text-accent-blue',
    failed: 'bg-accent-red/20 text-accent-red',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

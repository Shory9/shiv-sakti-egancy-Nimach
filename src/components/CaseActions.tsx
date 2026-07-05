type CaseActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onVisit?: () => void;
  onPayment?: () => void;
};

function CaseActions({
  onEdit,
  onDelete,
  onAssign,
  onVisit,
  onPayment,
}: CaseActionsProps) {
  return (
    <div
      className="case-actions"
      style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
    >
      <button className="primary-btn" onClick={onAssign}>
        Assign
      </button>

      <button className="primary-btn" onClick={onVisit}>
        Visit
      </button>

      <button className="primary-btn" onClick={onPayment}>
        Payment
      </button>

      <button className="edit-btn" onClick={onEdit}>
        Edit
      </button>

      <button className="delete-btn" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

export default CaseActions;
type CaseActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
};

function CaseActions({ onEdit, onDelete }: CaseActionsProps) {
  return (
    <div className="case-actions">
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
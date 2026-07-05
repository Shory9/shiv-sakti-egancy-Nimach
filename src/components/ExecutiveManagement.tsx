const executives = [
  { id: 1, name: "Amit", phone: "9876543210", area: "Nimach City", cases: 42, status: "Active" },
  { id: 2, name: "Rahul", phone: "9123456780", area: "Manasa", cases: 31, status: "Active" },
  { id: 3, name: "Vikram", phone: "9988776655", area: "Jawad", cases: 27, status: "On Leave" },
];

function ExecutiveManagement() {
  return (
    <div className="module-card">
      <h2>Executive Management</h2>
      <p>Field recovery executives and assigned case summary.</p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Cases</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {executives.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.area}</td>
              <td>{item.cases}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExecutiveManagement;
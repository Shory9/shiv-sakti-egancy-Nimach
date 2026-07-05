const locations = [
  {
    executive: "Amit",
    area: "Nimach City",
    status: "On Route",
    lastUpdate: "10:25 AM",
  },
  {
    executive: "Rahul",
    area: "Manasa",
    status: "At Customer",
    lastUpdate: "10:40 AM",
  },
  {
    executive: "Vikram",
    area: "Jawad",
    status: "Completed",
    lastUpdate: "09:55 AM",
  },
];

function GPSTracking() {
  return (
    <div className="module-card">
      <h2>GPS Tracking</h2>
      <p>Live status of field recovery executives.</p>

      <table>
        <thead>
          <tr>
            <th>Executive</th>
            <th>Area</th>
            <th>Status</th>
            <th>Last Update</th>
          </tr>
        </thead>

        <tbody>
          {locations.map((item, index) => (
            <tr key={index}>
              <td>{item.executive}</td>
              <td>{item.area}</td>
              <td>{item.status}</td>
              <td>{item.lastUpdate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GPSTracking;
import { useState } from 'react';

export default function Dashboard() {
  const [jobTitle, setJobTitle] = useState('');
  const [interviewType, setInterviewType] = useState('hr');

  return (
    <div className="dashboard">
      <h1>Welcome to your interview hub</h1>

      <div className="dashboard-card">
        <label>Job Title</label>
        <input
          type="text"
          placeholder="e.g. Software Engineer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
      </div>

      <div className="dashboard-card">
        <label>Interview Type</label>
        <select
          value={interviewType}
          onChange={(e) => setInterviewType(e.target.value)}
        >
          <option value="hr">HR Interview</option>
          <option value="technical">Technical Interview</option>
          <option value="full">Full Interview</option>
        </select>
      </div>

      <div className="dashboard-card">
        <label>Upload CV</label>
        <input type="file" accept=".pdf,.doc,.docx" />
      </div>

      <button className="btn btn-primary btn-lg">
        Start Interview
      </button>
    </div>
  );
}
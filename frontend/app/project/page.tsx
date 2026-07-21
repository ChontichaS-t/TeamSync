import Link from "next/link";

export default function ProjectPage() {
  return (
    <>
      <nav className="project-navbar" aria-label="Project navigation">
        <Link className="brand" href="/home" aria-label="TeamSync home">TeamSync</Link>
        <div className="project-navbar-menu">
          <Link href="/home">Home</Link>
          <Link className="project-navbar-active" href="/project">Project</Link>
          <Link href="/project#works">Works</Link>
          <Link href="/calendar">Calendar</Link>
        </div>
      </nav>

      <main className="project-page">
        <p className="project-page-label">Project</p>
        <h1>Badminton Tournament System</h1>
        <p>Project workspace is coming next.</p>
      </main>
    </>
  );
}

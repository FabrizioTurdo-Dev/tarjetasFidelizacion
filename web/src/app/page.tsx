import Link from "next/link";

export default function Inicio() {
  return (
    <main className="screen">
      <h1>Habitué</h1>
      <p className="muted">Tarjeta de fidelización para comercios. Elegí tu acceso:</p>
      <Link className="btn dark" href="/escanear/">Escanear (empleados)</Link>
      <Link className="btn dark" href="/panel/">Panel del negocio (dueños)</Link>
      <Link className="btn ghost" href="/admin/">Administración</Link>
    </main>
  );
}

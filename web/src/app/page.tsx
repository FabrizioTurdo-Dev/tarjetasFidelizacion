import Link from "next/link";
import { Firma } from "@/components/Firma";

export default function Inicio() {
  return (
    <main className="screen">
      <h1>De la Casa</h1>
      <p className="muted">Tarjeta de fidelización para comercios. Elegí tu acceso:</p>
      <Link className="btn dark" href="/panel/">Mi negocio (panel y escáner)</Link>
      <Link className="btn ghost" href="/mis-tarjetas/">Mis tarjetas (clientes)</Link>
      <Link className="btn ghost" href="/guia/">Cómo se usa (guía para negocios)</Link>
      <Link className="btn ghost" href="/admin/">Administración</Link>
      <Firma />
    </main>
  );
}

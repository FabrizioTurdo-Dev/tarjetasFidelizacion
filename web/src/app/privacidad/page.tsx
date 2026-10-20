// Domicilio provisorio (solo la localidad): cambiarlo por una casilla de correo u oficina virtual al empezar a cobrar.
// Conviene que la revise un abogado.
export const metadata = { title: "Política de privacidad · Habitué" };

export default function Privacidad() {
  return (
    <main className="screen" style={{ gap: 14 }}>
      <h1>Política de privacidad</h1>
      <p className="muted small">Última actualización: 20/10/2026</p>

      <h2>Quiénes somos</h2>
      <p>Habitué es una plataforma de tarjetas de fidelización digitales que presta el servicio a comercios de Argentina. Cada comercio decide para qué usa los datos de sus clientes. Habitué los guarda y procesa por cuenta del comercio. Responsable de la plataforma: Fabrizio Marcelo Turdó, CUIT 20-42229376-1, domicilio: Ingeniero Maschwitz, partido de Escobar, provincia de Buenos Aires, contacto: devfabri@gmail.com.</p>

      <h2>Qué datos guardamos</h2>
      <p>Solo los que hacen falta para tu tarjeta: tu nombre, tu teléfono o mail, tu fecha de cumpleaños (si la cargás, es opcional), tu número de socio, y el registro de tus visitas y de los premios que canjeás. <b>No pedimos DNI ni datos de pago.</b></p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Mostrarte tu tarjeta, tus visitas y tus premios.</li>
        <li>Que el comercio sepa cuántas veces volviste y te entregue los premios que ganaste.</li>
        <li>Saludarte en tu cumpleaños, si lo cargaste.</li>
      </ul>
      <p>No vendemos tus datos ni los compartimos con otros comercios.</p>

      <h2>Quién los ve</h2>
      <p>El comercio donde te registraste (su dueño y sus empleados) y el equipo de Habitué para dar soporte. Los datos se guardan en servidores de nuestro proveedor de base de datos (Supabase), que puede estar ubicado fuera de la Argentina.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>Mientras tu tarjeta esté activa en el comercio. Si el comercio deja de usar Habitué, se le avisa y se le permite exportar sus clientes antes de borrar los datos.</p>

      <h2>Tus derechos</h2>
      <p>Podés pedir en cualquier momento ver tus datos, corregirlos o que los borremos, escribiendo a devfabri@gmail.com o pidiéndoselo al comercio. El acceso es gratuito a intervalos no inferiores a seis meses, salvo que acredites un interés legítimo.</p>
      <p className="small muted">La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>

      <h2>Tu tarjeta es privada</h2>
      <p>Tu tarjeta se abre con un link secreto. Quien tenga el link puede ver tus visitas, así que no lo compartas. Si lo perdés, pedile al comercio que te lo reenvíe.</p>
    </main>
  );
}

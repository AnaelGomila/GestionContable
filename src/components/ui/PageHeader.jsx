export default function PageHeader({ titulo, subtitulo, children }) {
  return (
    <header className="page-header">
      <div className="titulos">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  )
}

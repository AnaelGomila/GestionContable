// Desenvuelve la respuesta de supabase-js: devuelve los datos o lanza el error.
export async function q(promesa) {
  const { data, error } = await promesa
  if (error) throw error
  return data
}

export function publicDataUnavailable(error) {
  console.error('Public data unavailable:', error);
  return new Response('Temporarily unavailable. Please try again shortly.', {
    status: 503,
    headers: { 'Cache-Control': 'no-store' }
  });
}

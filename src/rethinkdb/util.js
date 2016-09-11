export function now () {
  return this.r.now()
}

export default function (backend) {
  return {
    now: now.bind(backend)
  }
}
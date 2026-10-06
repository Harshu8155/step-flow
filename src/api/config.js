/**
 * Base URL of the backend.
 *
 * Set to this PC's LAN IP so BOTH the emulator and a physical phone (on the same
 * Wi-Fi) can reach the backend. `10.0.2.2` only works on the emulator, so it can't
 * be used for a real device.
 *
 * ⚠️ Requirements for a physical device:
 *   - phone and PC on the SAME Wi-Fi
 *   - the backend running on the PC (port 8080)
 *   - Windows Firewall allowing inbound TCP 8080
 *   - if the PC's IP changes (DHCP), update the address below
 *
 * For "any network" (mobile data / elsewhere), replace this with a public URL —
 * a cloudflared tunnel (https://<...>.trycloudflare.com) or a hosted backend.
 */
export const API_BASE_URL = 'http://10.97.160.14:8080';

import { KJUR } from 'jsrsasign';

/**
 * Generate JWT token for Zoom Meeting SDK
 */
export function generateZoomJWT(sdkKey: string, sdkSecret: string): string {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  const header = { alg: 'HS256', typ: 'JWT' };
  
  const payload = {
    iss: sdkKey,
    exp: exp,
    iat: iat,
    aud: 'zoom',
    appKey: sdkKey,
    tokenExp: exp,
    alg: 'HS256'
  };

  const token = KJUR.jws.JWS.sign('HS256', JSON.stringify(header), JSON.stringify(payload), sdkSecret);
  return token;
}

/**
 * Generate signature for joining a meeting
 */
export function generateMeetingSignature(
  sdkKey: string,
  sdkSecret: string,
  meetingNumber: string,
  role: '0' | '1'
): string {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  const header = { alg: 'HS256', typ: 'JWT' };
  
  const payload = {
    iss: sdkKey,
    iat: iat,
    exp: exp,
    aud: 'zoom',
    mn: meetingNumber,
    role: role,
    appKey: sdkKey,
    tokenExp: exp,
    alg: 'HS256'
  };

  const token = KJUR.jws.JWS.sign('HS256', JSON.stringify(header), JSON.stringify(payload), sdkSecret);
  return token;
}
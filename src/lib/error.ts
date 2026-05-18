/**
 * 서비스에서 에러 발생 시 클래스명이 그대로 노출되지 않도록 에러 문구를 정제하는 메소드입니다.
 * 
 * @param error 발생한 에러 객체 (unknown)
 * @param fallbackMessage 기본으로 표시할 에러 문구 (선택 사항)
 * @returns 정제된 한글 에러 메시지
 */
export function getErrorMessage(error: unknown, fallbackMessage: string = '요청 처리에 실패했습니다.'): string {
  if (!error) {
    return fallbackMessage;
  }

  let message = '';
  let errorCode = '';

  // 1. 에러 타입 분석 및 원본 메시지/에러코드 추출
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
    // FirebaseError 등 특정 에러 객체에는 'code' 필드가 존재할 수 있음
    if ('code' in error && typeof (error as any).code === 'string') {
      errorCode = (error as any).code;
    }
  } else if (typeof error === 'object') {
    // 일반 객체인 경우
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === 'string') {
      message = errObj.message;
    } else {
      message = String(error);
    }
    
    if (typeof errObj.code === 'string') {
      errorCode = errObj.code;
    } else if (errObj.firebaseError && typeof (errObj.firebaseError as any).code === 'string') {
      errorCode = (errObj.firebaseError as any).code;
    }
  } else {
    message = String(error);
  }

  // 1.5. 에러 코드가 없고 메시지만 존재할 때 메시지 문자열에서 에러 코드를 추출 시도
  if (!errorCode && message) {
    const codeMatch = message.match(/(auth\/[a-zA-Z0-9-_]+|permission-denied|unavailable|room-not-found)/i);
    if (codeMatch) {
      errorCode = codeMatch[1].toLowerCase();
    }
  }

  // 2. Firebase 에러 코드를 사용자 친화적인 한글로 우선 매핑
  if (errorCode) {
    const firebaseErrorMessage = mapFirebaseErrorCode(errorCode);
    if (firebaseErrorMessage) {
      return firebaseErrorMessage;
    }
  }

  // 3. 에러 클래스명 접두어 제거 (예: "FirebaseError: ...", "TypeError: ...", "Error: ...")
  // 정규식을 사용하여 대문자로 시작하고 Error로 끝나는 단어 뒤에 콜론과 공백이 있는 패턴을 제거합니다.
  const classPrefixRegex = /^([A-Z][a-zA-Z0-9_]*Error):\s*/;
  if (classPrefixRegex.test(message)) {
    message = message.replace(classPrefixRegex, '');
  }

  // "Firebase: " 또는 "Error: " 등의 라이브러리 및 브라우저 기본 접두사도 제거
  message = message.replace(/^(Firebase|Error):\s*/i, '');

  // 4. 일반적인 영문 에러 메시지 한글 매핑 및 정제
  const normalizedMessage = message.trim().toLowerCase();
  
  if (normalizedMessage.includes('room does not exist') || normalizedMessage.includes('room-not-found')) {
    return '존재하지 않는 방입니다. 방 코드를 다시 확인해 주세요.';
  }
  if (normalizedMessage.includes('permission_denied') || normalizedMessage.includes('permission denied')) {
    return '요청하신 작업을 수행할 권한이 없습니다.';
  }
  if (normalizedMessage.includes('network request failed') || normalizedMessage.includes('failed to fetch')) {
    return '네트워크 오류가 발생했습니다. 인터넷 연결 상태를 확인해 주세요.';
  }
  if (normalizedMessage.includes('user-not-found') || normalizedMessage.includes('user not found')) {
    return '존재하지 않는 사용자 계정입니다.';
  }
  if (normalizedMessage.includes('auth/invalid-credential')) {
    return '로그인 정보가 올바르지 않습니다.';
  }
  if (normalizedMessage.includes('cannot read properties of undefined') || normalizedMessage.includes('null')) {
    return '시스템 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  // 5. 클래스명이 전부 대문자이거나 알 수 없는 에러인 경우 정제 후 최종 메시지 반환
  // 정제 후에도 메시지가 비어있거나 너무 날것의 기술적인 문구(예: "cannot read properties of")인 경우 fallbackMessage 사용
  if (!message || message.includes('cannot read') || message.includes('undefined') || message.includes('object Object')) {
    return fallbackMessage;
  }

  return message;
}

/**
 * Firebase 인증 및 데이터베이스 관련 에러 코드를 직관적인 한글 에러 문구로 변환합니다.
 */
function mapFirebaseErrorCode(code: string): string | null {
  switch (code) {
    // Auth 관련 에러
    case 'auth/invalid-email':
      return '유효하지 않은 이메일 주소 형식입니다.';
    case 'auth/user-disabled':
      return '해당 계정은 비활성화 상태입니다. 관리자에게 문의하세요.';
    case 'auth/user-not-found':
      return '가입되어 있지 않은 이메일 주소입니다.';
    case 'auth/wrong-password':
      return '비밀번호가 올바르지 않습니다.';
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일 주소입니다.';
    case 'auth/weak-password':
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    case 'auth/operation-not-allowed':
      return '허용되지 않은 로그인 방식입니다.';
    case 'auth/network-request-failed':
      return '네트워크 오류로 로그인에 실패했습니다. 다시 시도해 주세요.';
    case 'auth/too-many-requests':
      return '단기간에 너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해 주세요.';
    
    // Database / Storage / Firestore 관련 에러
    case 'permission-denied':
    case 'PERMISSION_DENIED':
      return '데이터에 접근할 수 있는 권한이 없습니다.';
    case 'unavailable':
      return '서버가 일시적으로 중단되었거나 오프라인 상태입니다.';
    case 'room-not-found':
    case 'room/not-found':
      return '존재하지 않는 방입니다. 방 코드를 다시 확인해 주세요.';
    default:
      return null;
  }
}

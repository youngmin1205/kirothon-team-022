"""밥은 먹었니 — 자녀가 사진·기분 버튼으로 올린 안부를 받는 사람별 메시지로 만든다.

파일
    mock.json      데모 8구간 고정 시나리오. beats[].data 가 화면이 그릴 값의 계약이다
    profiles.json  고정 항목·기분 버튼·부모님 버튼·받는 사람 프로필 (데모용 고정값)
    router.py      /api/bab/{start,reply,reset,beats}
    service.py     프롬프트·도구 (spec 으로 채운다)

구간 id 는 .kiro/steering/product.md 의 데모 구간 표와 같다.
"""

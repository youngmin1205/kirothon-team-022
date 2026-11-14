# specs

여기는 **진행 중인 spec 이 들어오는 자리**입니다. 기능 하나에 폴더 하나이고,
각 폴더에 `requirements.md` · `design.md` · `tasks.md` 세 파일이 있습니다.

| 폴더 | 무엇인지 |
|---|---|
| [`bab/`](bab/) | 밥은 먹었니 — 요구사항 R1~R9 와 수락 기준, 설계, task 11개(L·BE·FE 라벨) |

`requirements.md` 의 수락 기준이 "끝났다"의 기준입니다. `tasks.md` 의 각 task 에는
`_요구사항: R#_` 로 어떤 기준을 만족시켜야 하는지 적혀 있고, 그 기준은 `tests/` 의
테스트로 확인합니다.

spec 은 **대화형으로** 만듭니다 (`kiro-cli --agent build`).

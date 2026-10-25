# References and character assets

## Desktop pet implementation

- [AHaldner/desktop-pet](https://github.com/AHaldner/desktop-pet) (MIT): reference for the small Electron transparent, frameless, always-on-top pet window and native context-menu pattern. The implementation here is independently written; this is not a clone of the upstream repository.
- [IvenKooLab/desktop-pet](https://github.com/IvenKooLab/desktop-pet) (MIT): interaction reference for dragging, gravity, toss, bounce, and click reactions. No upstream character assets or code are bundled.

## Character

`src/pet/torami.svg` is a manually drawn, editable vector fan prototype based on the appearance of TORAMUI / 토라뮈 / 兔岚咪, the Hearts2Hearts character associated with YUHA. It is not an official sprite or an exact reproduction.

Visual reference viewed during development: [TORAMUI reference image](https://kprofiles.com/wp-content/uploads/2026/03/TORAMUI.jpg), linked from [Hakyuha character profile](https://kprofiles.com/hakyuha-hearts2hearts-profile/). The original reference image is not shipped in the application.

Character designs, names, and related brand rights belong to their respective rights holders. The MIT license covers this project's original code and does not grant rights to the underlying character or trademarks.

## Voice and gesture reference

The “生气了，哼！” interaction adapts the grey-sweatshirt performance from [삐진 토라뮈 모음집](https://www.youtube.com/shorts/nwy38Jg5PHQ), channel @하츠온하츠. A 2.35-second excerpt (00:02.250–00:04.600) of its Korean original audio is included at the user's request. The same grey-sweatshirt scene appears in [yuha标准动作：兔岚咪生气了！](https://weibo.com/2/detail/5338062938964954).

The recording is third-party material and is not licensed under the code's MIT license. See `src/assets/audio/README.md` for exact provenance and processing. No synthetic voice or voice clone is used.

## Desktop behavior reference (0.3)

The user-supplied [Douyin video by 凉凉最爱4536](https://www.douyin.com/video/7699216927968808243) demonstrates ear-covering shyness, sitting, swaying, walking, dragging, window-top interaction and Shimeji-style menus. Version 0.3 independently implements the visible behaviors and menu functions for macOS. No video, author sprite frames, executable or Shimeji code is shipped. See `docs/reference-features.md` for the observed-function mapping and platform differences.

macOS window geometry uses Apple's documented [CGWindowListCopyWindowInfo](https://developer.apple.com/documentation/coregraphics/cgwindowlistcopywindowinfo(_:_:)) API. Explicit window movement and restoration use Accessibility APIs, only after the user chooses to push a window and macOS permission is available.

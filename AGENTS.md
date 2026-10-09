<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Letter Head inside the MC workflow navigation group because it is an MC workflow.
- Use the shared NavGroup disclosure for main menu groups so desktop and mobile navigation have consistent accessible expand/collapse controls.
- Keep the auth screen in one shared layout across devices and constrain dashboard grid children so wide tables scroll locally rather than widening the page.
- Keep dashboard tabs in the main grid column and notifications in an unconditional sibling aside so switching tabs or empty data never removes the notifications column.
- Keep asset file normalization in the shared asset-import helper and let the database assign saved Asset IDs so manual and imported rows use the same sequence.

# Neutral workspace selection in DSH Web

On DSH 0.2.2-rc.5, global **New Session** otherwise inherits the current or most recent project. This Web overlay uses DSH's registered **Default workspace**. If none is available, it shows **Choose workspace**. Starting a session from a specific project and reopening existing sessions still use their recorded locations.

## Enable on an existing Web installation

1. Stop Web normally and back up its active profile's `cordis.patch.yml`.
2. Run `node prepare-overlay.mjs <rc.5-ui-workspace-package> <overlay-directory>`. Use the installed `node_modules/@deepseek-ai/dsh-client-ui-workspace` package as the source. Choose a persistent overlay directory outside `node_modules`. The generator checks the package version and both upstream code anchors.
3. Append the following to the active Web profile. Replace the file URL with the generated overlay's absolute `lib/index.js` URL.

   ```yaml
   - id: ui-workspace
     name: '@deepseek-ai/dsh-client-ui-workspace'
     disabled: true
   - insert:
       - id: ui-workspace-neutral-default
         name: 'file:///C:/path/to/overlay/lib/index.js'
   ```

4. Start Web normally. From an existing project session, select the global **New Session** button. Confirm that the neutral workspace or chooser appears. To roll back, stop Web and remove the two profile entries added above, then start it normally.

## Verification and Desktop scope

An isolated rc.5 browser check reproduced the existing-project fallback before the change. With the installed Web overlay, global New Session opened the default or the chooser depending on the fixture. The explicit project action kept its project working directory. These checks ran headlessly with zero model requests.

The Desktop profile templates no longer register the retired Verdict goal-limit command. Existing session history, saved workspace registrations, and project repositories are independent of that command. The Desktop workspace overlay was tested in isolation and later rolled back on Halo after a report of a missing composer. Desktop restart restored the composer. Desktop overlay deployment remains out of scope for this release.

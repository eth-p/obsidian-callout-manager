{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  packages = [
    pkgs.git
  ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  scripts.installCalloutManager = {
    description = "Re-installs the plugin into an Obsidian vault.";
    exec = ''
      VAULT_PATH="''${1?Vault path required}"
      PLUGIN_PATH="$VAULT_PATH/.obsidian/plugins/callout-manager"

      install_file() {
        if ! [[ -e "$2" ]]; then
          cp -a "$1" "$2"
          return $?
        fi

        src_hash=$(sha256sum "$1" | cut -d' ' -f1)
        dst_hash=$(sha256sum "$2" | cut -d' ' -f2)
        if [[ "$src_hash" != "$dst_hash" ]]; then
          cp -a "$1" "$2"
        fi
      }

      mkdir -p "$PLUGIN_PATH"
      cp manifest.json "$PLUGIN_PATH/manifest.json"
      cp dist/main.js "$PLUGIN_PATH/main.js"
      cp dist/styles.css "$PLUGIN_PATH/styles.css"
    '';
  };

  scripts.developCalloutManager = {
    packages = [ pkgs.entr ];
    exec = ''
      VAULT_PATH="''${1?Vault path required}"
      RELOADER_PATH="''${VAULT_PATH}/.obsidian/plugins/callout-manager-dev-reloader"

      cleanup() {
        if [[ -n "$WATCHER_PID" ]]; then
          echo "Stopping file watcher..."
          kill "$WATCHER_PID"
        fi
      }

      trap cleanup EXIT

      # Install the reloader.
      cp -r utils/dev-reloader "$RELOADER_PATH"

      # Start watching for build output changes.
      ({
        printf "dist/main.js\ndist/styles.css\n" |
          entr -np installCalloutManager "$VAULT_PATH"
      }) &
      WATCHER_PID="$!"

      # Start building.
      npm run dev
    '';
  };
}

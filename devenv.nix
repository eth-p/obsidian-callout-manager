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

        src_hash=$(sed -E '/^\/\/# sourceMappingURL/d' "$1" | sha256sum | cut -d' ' -f1)
        dst_hash=$(sed -E '/^\/\/# sourceMappingURL/d' "$2" | sha256sum | cut -d' ' -f1)
        if [[ "$src_hash" != "$dst_hash" ]]; then
          cp -a "$1" "$2"
          echo "Updated $1"
        fi
      }

      mkdir -p "$PLUGIN_PATH"
      install_file manifest.json "$PLUGIN_PATH/manifest.json"
      install_file dist/main.js "$PLUGIN_PATH/main.js"
      install_file dist/styles.css "$PLUGIN_PATH/styles.css"
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
      mkdir -p "$RELOADER_PATH"
      cp utils/dev-reloader/main.js "$RELOADER_PATH/main.js"
      cp utils/dev-reloader/manifest.json "$RELOADER_PATH/manifest.json"

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

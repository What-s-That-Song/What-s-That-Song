{
  description = "Dev environment for Early (React Native/Expo)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            yarn
            watchman # Important pour React Native

            # Backend Go + pipeline audio
            go
            ffmpeg
            demucs-rs # Séparation des instruments (HTDemucs v4)
          ];

          shellHook = ''
            echo "⚛️ Environnement React Native (Expo) prêt !"
            echo "Node version: $(node -v)"
          '';
        };
      }
    );
}

{ pkgs }: {
  deps = [
    pkgs.go
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.postgresql_16
    pkgs.libxcrypt
    pkgs.bash
  ];
}

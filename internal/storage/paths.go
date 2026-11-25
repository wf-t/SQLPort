// Package storage owns the on-disk side of the app: connection profiles in
// SQLite and the matching passwords in the OS keyring. Nothing else should
// touch either of those directly — go through this package.
//
// Key rule (CLAUDE.md #8): passwords NEVER live in SQLite. They are written
// to the OS keyring keyed on the connection's UUID; SQLite only carries the
// non-secret fields.
package storage

import (
	"fmt"
	"os"
	"path/filepath"
)

// AppConfigDir returns the platform-appropriate user-config dir for sqlport and
// ensures it exists. Used for the SQLite database, future preferences, etc.
// Dev builds use "sqlport-dev" instead (see appname_dev.go) so development data
// never mixes with a production install.
//
//	macOS:   ~/Library/Application Support/sqlport
//	Linux:   $XDG_CONFIG_HOME/sqlport  (or ~/.config/sqlport)
//	Windows: %AppData%\sqlport
func AppConfigDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("storage: locate user config dir: %w", err)
	}
	dir := filepath.Join(base, appName)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("storage: create %s: %w", dir, err)
	}
	return dir, nil
}

// DefaultDBPath is the path of the SQLite file under AppConfigDir.
func DefaultDBPath() (string, error) {
	dir, err := AppConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "sqlport.db"), nil
}

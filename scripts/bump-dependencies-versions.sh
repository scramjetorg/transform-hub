#!/bin/bash

dependencies_new_versions="$1" # get version from yarn NEXT_VER variable

find_packages() {
    local dir="$1"

    for file in "$dir"/*; do
        if [[ -d "$file" ]]; then
            find_packages "$file"  # searching subdirectory
        elif [[ -f "$file" && "$file" == *"/package.json" ]]; then
            process_package_json "$file"  # edit package.json file
        fi
    done
}

process_package_json() {
    local file="$1"
    local dependencies
    #search for dependencies and devDependencies starterd with @scramjet/ to bump their version
    if dependencies=$(jq -r '(.dependencies // {} + .devDependencies // {}) | to_entries[] | select(.key | startswith("@scramjet/")) | "\(.key)@\(.value)"' "$file" 2>/dev/null); then
        if jq --arg dependencies_new_versions "$dependencies_new_versions" '(.dependencies // {} + .devDependencies // {}) |= with_entries(if .key | startswith("@scramjet/") then .value = $dependencies_new_versions else . end)' "$file" > temp.json 2>/dev/null; then
            mv temp.json "$file"
            if [[ -n "$dependencies" ]]; then
                echo "File: $file"
                while IFS= read -r dependency; do
                    echo " - $dependency bumped to $dependencies_new_versions"
                done <<< "$dependencies"
                echo
            fi
        fi
    fi
}

#bump version in image-config file
bump_image_config() {
    local file="packages/sth-config/src/image-config.json"
    local temp_file="temp.json"

    jq --arg dependencies_new_versions "$dependencies_new_versions" \
        '.runner |= with_entries(.value |= sub(":.*$"; ":" + $dependencies_new_versions)) |
        .prerunner |= sub(":.*$"; ":" + $dependencies_new_versions)' "$file" > "$temp_file" \
        && mv "$temp_file" "$file"

    echo "Updated image-config.json to $dependencies_new_versions"
}

find_packages "bdd/"
find_packages "packages/"
bump_image_config

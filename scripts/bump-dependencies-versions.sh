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
    local dependencies dev_dependencies
    
    if dependencies=$(jq -r '(.dependencies // {}) | to_entries[] | select(.key | startswith("@scramjet/")) | "\(.key)@\(.value)"' "$file" 2>/dev/null); then
        if jq --arg dependencies_new_versions "$dependencies_new_versions" '(.dependencies // {}?) |= with_entries(if .key | startswith("@scramjet/") then .value = (if .value | startswith("^") then "^" else "" end) + ($dependencies_new_versions | sub("^\\^"; "")) else . end)' "$file" > temp.json 2>/dev/null; then
            mv temp.json "$file"
            if [[ -n "$dependencies" ]]; then
                echo "Updating $file"
                echo "Updated dependencies:"
                while IFS= read -r dependency; do
                    echo " - $dependency bumped to $dependencies_new_versions"
                done <<< "$dependencies"
            fi
        fi
    fi

    if dev_dependencies=$(jq -r '(.devDependencies // {}) | to_entries[] | select(.key | startswith("@scramjet/")) | "\(.key)@\(.value)"' "$file" 2>/dev/null); then
        if jq --arg dependencies_new_versions "$dependencies_new_versions" '(.devDependencies // {}?) |= with_entries(if .key | startswith("@scramjet/") then .value = (if .value | startswith("^") then "^" else "" end) + ($dependencies_new_versions | sub("^\\^"; "")) else . end)' "$file" > temp.json 2>/dev/null; then
            mv temp.json "$file"
            if [[ -n "$dev_dependencies" ]]; then
                echo "Updated devDependencies:"
                while IFS= read -r dependency; do
                    echo " - $dependency bumped to $dependencies_new_versions"
                done <<< "$dev_dependencies"
                echo
                echo "------------------------"
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

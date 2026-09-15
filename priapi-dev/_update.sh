#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

function Usage() {
    cat <<USAGE
$_script: $*
Usage: $_script [-v] (--copy|--dry-run|--diff) (--forward|--backward)
                        -v: Enable verbose mode.
 (--copy|--dry-run|--diff): Specify what to do.
                    --copy: Perform actual file copying.
                 --dry-run: List file paths that will be copied without actually copying.
                    --diff: Display differences between files.
    (--forward|--backward): Specify the direction of copying.
                 --forward: Copy updated files from dev to beta, or beta to release.
                --backward: Copy updated files from beta to dev, or release to beta.
USAGE
    exit 1
}

function difference() {
    local argv=($*)         # このやり方は引数の文字列のどれかにスペースが含まれているとダメ。$* を参照した時点でスペースで分割されてしまう多分。
    local argc=${#argv[@]}
    let local exclude_count=$argc-4
    local exclude=(${argv[@]:0:$exclude_count})
    shift $exclude_count
    local current_dir="$1"
    local current_dir_base="`basename $current_dir`"
    local upper_host="$2"
    local upper_dir="$3"
    local upper_dir_base="`basename $upper_dir`"
    local direction="$4"
    local tmp_dir="/tmp/$_script.$$"
    rm -rf "$tmp_dir"
    mkdir "$tmp_dir"
    if [ $? -ne 0 ]; then
        log "Can't create $tmp_dir"
        return 1
    fi
    if [ $_verbose -eq 0 ]; then
        rsync -az ${exclude[@]} "localhost:$current_dir" "$tmp_dir" > /dev/null
        rsync -az ${exclude[@]} "$upper_host:$upper_dir" "$tmp_dir" > /dev/null
        if [ "$direction" = 'forward' ]; then
            find "$tmp_dir/$upper_dir_base" -type f -exec "$_absolute_script_dir/_diff.sh" {} "$tmp_dir/$upper_dir_base" "$tmp_dir/$current_dir_base" \;
        else
            find "$tmp_dir/$current_dir_base" -type f -exec "$_absolute_script_dir/_diff.sh" {} "$tmp_dir/$current_dir_base" "$tmp_dir/$upper_dir_base" \;
        fi
    else
        rsync -avz ${exclude[@]} "localhost:$current_dir" "$tmp_dir" 1>&2
        rsync -avz ${exclude[@]} "$upper_host:$upper_dir" "$tmp_dir" 1>&2
        if [ "$direction" = 'forward' ]; then
            find "$tmp_dir/$upper_dir_base" -type f -exec "$_absolute_script_dir/_diff.sh" --verbose {} "$tmp_dir/$upper_dir_base" "$tmp_dir/$current_dir_base" \;
        else
            find "$tmp_dir/$current_dir_base" -type f -exec "$_absolute_script_dir/_diff.sh" --verbose {} "$tmp_dir/$current_dir_base" "$tmp_dir/$upper_dir_base" \;
        fi
    fi
    rm -rf "$tmp_dir"
}

function main() {

    if [[ ! "$_cwd" =~ ^/var/www/([^.-]+)(-dev|-beta)\.(.*)$ ]]; then
        log "Can't do that here."
        log "Quitting."
    fi
    local proj="${BASH_REMATCH[1]}"
    local env="${BASH_REMATCH[2]}"
    local dom="${BASH_REMATCH[3]}"
    local upper_env
    if [ "$env" = '-dev' ]; then
        upper_env='-beta'
    else
        upper_env=''
    fi

    # ようやくできた「過不足のない除外・包含」
    local exclude=(
        --exclude=',*'
        --include='db/_*.sh'
        --include='db/_starship.sql'
        --include='db/readme.txt'
        --exclude='db/*'        # */
        --exclude='*.sock'
        --exclude='_logs/'
        --exclude='_tars/'
        --exclude='var_dump*'
    )

    local current_dir="/var/www/$proj$env.$dom"
    local upper_host='localhost'
    local upper_dir="/var/www/$proj$upper_env.$dom"

    local direction
    if [[ "${_options[@]}" =~ --forward ]]; then
        direction='forward'
    elif [[ "${_options[@]}" =~ --backward ]]; then
        direction='backward'
    else
        Usage 'Specify --forward or --backward'
    fi

    if [[ "${_options[@]}" =~ --copy ]]; then
        if [ "$direction" = 'forward' ]; then
            rsync -avz ${exclude[@]} "$current_dir/" "$upper_host:$upper_dir"
        else
            rsync -avz ${exclude[@]} "$upper_host:$upper_dir/" "$current_dir"
        fi
    elif [[ "${_options[@]}" =~ --dry-run ]]; then
        if [ "$direction" = 'forward' ]; then
            rsync --dry-run -avz ${exclude[@]} "$current_dir/" "$upper_host:$upper_dir"
        else
            rsync --dry-run -avz ${exclude[@]} "$upper_host:$upper_dir/" "$current_dir"
        fi
    elif [[ "${_options[@]}" =~ --diff ]]; then
        difference ${exclude[@]} "$current_dir" "$upper_host" "$upper_dir" "$direction"
    else
        Usage 'Specify --copy, --dry-run, or --diff'
    fi

    return $?
}

main

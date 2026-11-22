#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<dirent.h>
#include<sys/stat.h>
#ifdef _WIN32
#include<windows.h>
#else
#include<unistd.h>
#endif
#define MAX_PATH_LEN 1024

void open_target(const char *target_path)
{
    char command[MAX_PATH_LEN + 64];
    #ifdef _WIN32{
        snprintf(command, sizeof(command), "start \"\" \"%s\"",target_path);
    }
    #elif __APPLE__{
        snprintf(command, sizeof(command), "open \"%s\"", target_path);
    }
    #else{
        snprintf(command, sizeof(command), "xdg-open \"%s\"", target_path)
    }
   
    printf("[C Core] Executing: %s\n", command);
    int result = system(command);
        if(result == 0){
        printf("[C Core] Successfully opened: %s\n", target_path);
        } else {
        printf( "[C Core] Failed to open: %s\n", target_path);
        }
    #endif}

void search_file(const char *base_path, const char *query){
    char path[MAX_PATH_LEN];
    struct dirent *dp;
    DIR *dir = opendir(base_path);
    if (!dir) return;
    while((dp = readdir(dir)) != NULL){
        if (strcmp(dp->d_name, ".") != 0 && strcmp(dp->d_name, "..") != 0){
            snprintf(path, sizeof(path), "%s/%s", base_path, dp->d_name);
            struct stat path_stat;
            stat(path, &path_stat);
            if (S_ISDIR(path_stat.st_mode)){
                search_file(path, query);
            } else {
                if (strstr(dp->d_name, query) != NULL){
                    printf("[C Core] Found: %s\n", path);
                    open_target(path);
                }
            }
        }
    }
    closedir(dir);
}
int main(int argc, char *argv[])
{
    if(argc < 3){
        printf("Usage:\n");
        printf("%s open <path_to_file>\n", argv[0]);
        printf("%s search <directory> <query>\n", argv[0]);
        return 1;   
    }
    if(strcmp(argv[1], "open") == 0){
        open_target(argv[2]);
    } else if (strcmp(argv[1], "search") == 0 && argc > 4){
       printf("[C Core] Searching for %s inside %s\n", argv[3], argv[2]);
       search_file(argv[2], argv[3]);
    } else {
        printf("Unknown command\n");
    }
    return 0;
}

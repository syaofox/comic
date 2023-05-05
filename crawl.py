import os
from playwright.sync_api import sync_playwright, BrowserContext, Response
from configFinder import ConfigFinder


class Crawler:

    comic_idx = 0
    pice_idx = 0
    comic_list = []

    @classmethod
    def get_comic_urls(cls, start_url: str):
        '''
        根据输入的漫画地址获取需要爬取的漫画列表
        '''
        comic_list = []
        if start_url.endswith('.json'):
            for comic in ConfigFinder.json_finder(start_url):
                comic_list.append(comic)
        else:
            comic_list.append(start_url)

        return comic_list

    @classmethod
    def run(cls, start_url: str):
        '''
        主函数
        '''
        # 获取需要爬取的漫画列表
        cls.comic_list = cls.get_comic_urls(start_url)
        print(cls.comic_list)


if __name__ == "__main__":
    Crawler.run('https://tw.manhuagui.com/comic/23333/')
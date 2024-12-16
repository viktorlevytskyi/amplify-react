import React, { useState, useRef, KeyboardEvent } from 'react';
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

const AutocompleteSearch: React.FC = () => {
  // State with explicit typing
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Array<Schema["Translation"]["type"]>>([]);
  const [selectedTranslation, setSelectedTranslation] = useState<Schema["Translation"]["type"] | undefined>(undefined);
  const [articles, setArticles] = useState<Array<Schema["Article"]["type"]>>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [historyList, setHistoryList] = useState<string[]>([])

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<(HTMLLIElement | null)[]>([]);

  // Typed event handler for search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setActiveIndex(-1);

    // Filtering with type-safe method
    if (value) {
      client.models.Translation.list({
        filter: {
          wordPattern: { beginsWith: value.toLocaleLowerCase() }
        }
      }).then(res => setSuggestions(res.data));
    } else {
      setSuggestions([]);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Cycle to the first item if at the end, otherwise move down
        const nextIndex = activeIndex < suggestions.length - 1 
          ? activeIndex + 1 
          : 0;
        setActiveIndex(nextIndex);
        
        // Scroll the active suggestion into view
        suggestionsRef.current[nextIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        // Cycle to the last item if at the start, otherwise move up
        const prevIndex = activeIndex > 0 
          ? activeIndex - 1 
          : suggestions.length - 1;
        setActiveIndex(prevIndex);
        
        // Scroll the active suggestion into view
        suggestionsRef.current[prevIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
        break;

      case 'Enter':
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSuggestionClick(suggestions[activeIndex]);
        }
        break;

      case 'Escape':
        setSuggestions([]);
        setActiveIndex(-1);
        break;
    }
  };

  // Typed suggestion click handler
  const handleSuggestionClick = async (translation: Schema["Translation"]["type"]) => {
    setSearchTerm(translation.word);
    setSelectedTranslation(translation);
    historyList.push(translation.word);
    client.models.Article.list({
      filter: {
        word: { eq: translation.word }
      }
    }).then(res => setArticles(res.data));
    //setActiveIndex(-1);
    
    // Return focus to input after selection
    inputRef.current?.focus();
  };

  const json2html = (input: string, word: string, dictEntry?: Schema["Translation"]["type"]) => {
    var pos = dictEntry?.shorteningPos;
    if (pos != null) {
        input = input.replace(/~/g, pos == 0 ? word : word.substring(0, pos));
    }
    
    input = input.replace(/\\n/g, '\n');

    if (dictEntry?.dict == 'crh-ru') {
        input = input.replace(/(лингв|перен|физ|хим|бот|биол|зоо|грам|геогр|астр|шк|мат|анат|ирон|этн|стр|рел|посл|уст)\./g,'<i class="spec">$&</i>');
        input = input.replace(/\/(.+?)\//g,'<i class="spec">$1</i>');
    }
    

    input = input.replace(/(ср|см)\. (.+)$/mg,
       (_str, p1: string, p2: string, _offset, _s) => {
           var words = p2.split(/\s*,\s*/);
           var links = '';
           words.forEach((val: string, _index: number, _arr: string[]) => {
               links += '<a href="#" onclick="return app.insert_and_submit(\''+val+'\');" >'+val+'</a>, ';
           });
           return '<i class="link">'+p1+'.</i> '+links.slice(0, -2);
       }
    );
    input = input.replace(/^(.[^)].+?) - (.+?)$/mg,'<b>$1</b> $2');
    input = input.replace('◊', '\n◊\n'); 
    input = input.replace(/\n/g, '<br/>');
    input = input.replace(/; /g, '<br/>');
    return input;
  }
  

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div id="app" className="app">
        <table><tbody>
            <tr>
            <td>
                <ul className="word-list">
                {suggestions.map((transalation, index) => (
                    <li key={transalation.word}
                        id={`suggestion-${transalation.word}`}
                        ref={el => suggestionsRef.current[index] = el}
                        onClick={() => handleSuggestionClick(transalation)}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={
                            index === activeIndex 
                                ? 'active' 
                                : ''
                        }
                        >
                        {transalation.word}
                    </li>
                ))}
                </ul>
            </td>
            <td>
                <div className="input-group">
                <input
                    id="search-input"
                    className="form-control"
                    v-model="wordInput"
                    ref={inputRef}
                    type="text" 
                    placeholder="Search fruits..." 
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    aria-label="Search fruits"
                    aria-autocomplete="list"
                    aria-controls="suggestions-list"
                    aria-activedescendant={
                      activeIndex >= 0 
                        ? `suggestion-${suggestions[activeIndex].word}` 
                        : undefined
                    }
                    />
                <button className="btn btn-primary"
                        v-on:click="submitEnter">OK
                </button>
                </div>

                <div className="history-wrapper">
                  {historyList.map((item) => (
                    <div className="history-entry">{item}</div> 
                  ))}
                </div>

                <div className="dict-wrapper" v-if="dictEntry">
                <div v-if="dictEntry.articles.length > 1">
                    <div className="dict-entry" v-for="article in dictEntry.articles">
                    <div className="word"></div>
                    <div className="article"
                        v-html="json2html(article.text, dictEntry.word, dictEntry)">
                    </div>
                    </div>
                </div>
                <div className="dict-entry" v-else>
                    <div className="word">{ selectedTranslation?.word }</div>
                    <div className="article single-article">
                        {articles?.map((article, _index) => (
                            <div dangerouslySetInnerHTML={{__html: json2html(article.text, article.word, selectedTranslation)}}>
                            </div>
                        ))}
                    </div>
                    </div>
                </div>
            </td>
            </tr>
        </tbody></table>
        </div>
    </div>
  );
};

export default AutocompleteSearch;
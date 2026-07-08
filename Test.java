import org.springframework.ai.vectorstore.SearchRequest;
import java.lang.reflect.Method;
public class Test {
    public static void main(String[] args) {
        for (Method m : SearchRequest.class.getMethods()) {
            if (m.getName().startsWith("with")) {
                System.out.println(m.getName());
            }
        }
    }
}
